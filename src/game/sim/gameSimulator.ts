import type { Player } from '@/game/models/player'
import type { Team, LineupSettings } from '@/game/models/team'
import type {
  GameState,
  SimEvent,
} from '@/game/models/sim'
import {
  emptyPlayerGameStats,
  emptyTeamGameStats,
} from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import type { EraConfig } from '@/game/models/eraConfig'
import type { LeagueRules } from '@/game/models/leagueRules'
import {
  resolvePossession,
  selectPossessionType,
} from '@/game/sim/possessionEngine'
import { strategyThreePointRate } from '@/game/sim/strategyEngine'
import { isClutch } from '@/game/sim/clutchEngine'
import { accumulateGameFatigue } from '@/game/sim/postGameProcessor'
import {
  planSubstitutions,
  type PlannedSub,
} from '@/game/sim/substitutionEngine'
import { rankKeyPlays } from '@/game/sim/keyPlays'
import { isInjured } from '@/game/management/rotationValidator'
import { rollForInjury, applyInjuryToHealth } from '@/game/sim/injuryEngine'
import {
  QUARTER_SECONDS,
  OT_SECONDS,
  MAX_POSSESSIONS_PER_PERIOD,
  BASE_TIME_SECONDS,
  BONUS_FOULS_REGULATION,
  BONUS_FOULS_OT,
  BONUS_FOULS_LAST_TWO_MIN,
  CRUNCH_TIME_MINUTES,
  BLOWOUT_MARGIN_Q4_LATE_720,
  BLOWOUT_MARGIN_Q4_LATE_540,
  BLOWOUT_MARGIN_Q4_LATE_420,
  BLOWOUT_MARGIN_Q4_LATE_180,
  BLOWOUT_MARGIN_Q4_LATE_60,
} from '@/game/sim/simConstants'
import {
  buildLiveGameSnapshot,
  type LiveGameSnapshot,
} from '@/game/sim/liveGameSnapshot'
import { LIVE_SIM_POSSESSION_DELAY_MS } from '@/game/league/scheduleConstants'
import {
  getClockFactor,
  shouldIntentionalFoul,
  shouldCallTimeout,
} from '@/game/sim/clockEngine'
import { resolveTechnical, isTechnicalEjection } from '@/game/sim/foulModel'
import {
  updatePlayerStreaks,
  updateTeamStreaks,
} from '@/game/sim/streakTracker'
import {
  applyMomentum,
  decayMomentum,
  addRunPoints,
  checkForRun,
  momentumModifier as getMomentumModifier,
  type MomentumState,
} from '@/game/sim/momentumEngine'
import {
  checkRolePlayerEruption,
  checkSuperstarStinker,
  checkInjuryOnContact,
} from '@/game/sim/randomEventsEngine'
import { FOUL_OUT_LIMIT } from '@/game/sim/simConstants'

export interface SimulateGameInput {
  id: string
  home: Team
  away: Team
  homeLineup: LineupSettings
  awayLineup: LineupSettings
  homePlayers: Player[]
  awayPlayers: Player[]
  rules: LeagueRules
  era: EraConfig
  rng: SeededRandom
  date: string
  injuriesEnabled: boolean
  fatigueEnabled: boolean
  simSpeed: 'instant' | 'normal'
  onTick?: (snapshot: LiveGameSnapshot) => void | Promise<void>
  /** Override possession delay in normal mode (tests use 0). */
  possessionDelayMs?: number
}

export interface SimulateGameOutput {
  gameState: GameState
  keyPlays: SimEvent[]
  gameFatigue: Record<string, number>
}

export async function simulateGame(input: SimulateGameInput): Promise<SimulateGameOutput> {
  const homeById = playerMap(input.homePlayers)
  const awayById = playerMap(input.awayPlayers)

  const startingHome = ensureFive(input.homeLineup.starters, input.homePlayers, homeById)
  const startingAway = ensureFive(input.awayLineup.starters, input.awayPlayers, awayById)

  const playerStats: Record<string, ReturnType<typeof emptyPlayerGameStats>> = {}
  for (const id of [...startingHome, ...startingAway]) {
    const teamId = startingHome.includes(id) ? input.home.id : input.away.id
    playerStats[id] = emptyPlayerGameStats(id, teamId, true)
  }

  const state: GameState = {
    id: input.id,
    homeTeamId: input.home.id,
    awayTeamId: input.away.id,
    date: input.date,
    status: 'in_progress',
    attendance: 18000,
    arena: input.home.arena ?? `${input.home.city} Arena`,
    clock: { period: 1, timeRemainingSeconds: QUARTER_SECONDS },
    score: { home: 0, away: 0 },
    possession: input.rng.chance(0.5) ? 'home' : 'away',
    arrow: input.rng.chance(0.5) ? 'home' : 'away',
    teamStats: {
      home: emptyTeamGameStats(input.home.id),
      away: emptyTeamGameStats(input.away.id),
    },
    playerStats,
    fouls: {
      home: { team: 0, byPlayer: {} },
      away: { team: 0, byPlayer: {} },
    },
    teamFoulsThisQuarter: { home: 0, away: 0 },
    lineupOnCourt: {
      home: [...startingHome],
      away: [...startingAway],
    },
    startingLineups: {
      home: [...startingHome],
      away: [...startingAway],
    },
    minutesPlayed: {},
    gameFatigue: {},
    events: [],
    playerStreaks: {},
    teamStreaks: [{ consecutiveMakes: 0, consecutiveMisses: 0 }, { consecutiveMakes: 0, consecutiveMisses: 0 }],
    momentum: [50, 50],
    runCounter: [{ points: 0, since: 0 }, { points: 0, since: 0 }],
    eruptionPlayerId: null,
    stinkerPlayerId: null,
    injuriesEnabled: input.injuriesEnabled,
    fatigueEnabled: input.fatigueEnabled,
    overtimeOccurred: false,
    overtimeTiebreakerUsed: false,
    homeWin: null,
  }

  const homeBenchIds = input.homePlayers.filter(p => !startingHome.includes(p.id)).map(p => p.id)
  const awayBenchIds = input.awayPlayers.filter(p => !startingAway.includes(p.id)).map(p => p.id)
  const homeStars = input.homePlayers.filter(p => p.ratings.overall >= 80).map(p => p.id)
  const awayStars = input.awayPlayers.filter(p => p.ratings.overall >= 80).map(p => p.id)
  state.eruptionPlayerId = checkRolePlayerEruption(input.rng, [...homeBenchIds, ...awayBenchIds])
  state.stinkerPlayerId = checkSuperstarStinker(input.rng, [...homeStars, ...awayStars])

  for (let period = 1 as 1 | 2 | 3 | 4; period <= 4; period = (period + 1) as 1 | 2 | 3 | 4) {
    state.clock = { period, timeRemainingSeconds: QUARTER_SECONDS }
    state.fouls.home.team = 0
    state.fouls.away.team = 0
    state.teamFoulsThisQuarter = { home: 0, away: 0 }
    state.events.push({ type: 'endOfPeriod', period: period - 1 })
    await playPeriod(state, input, homeById, awayById, period)
  }

  if (state.score.home === state.score.away) {
    let otPeriod = 5 as 5 | 6 | 7
    while (state.score.home === state.score.away && otPeriod <= 7) {
      state.overtimeOccurred = true
      state.teamFoulsThisQuarter = { home: 0, away: 0 }
      state.clock = { period: otPeriod, timeRemainingSeconds: OT_SECONDS }
      state.events.push({ type: 'endOfPeriod', period: otPeriod - 1 })
      await playPeriod(state, input, homeById, awayById, otPeriod)
      otPeriod = (otPeriod + 1) as 5 | 6 | 7
    }
  }

  if (state.score.home === state.score.away) {
    state.overtimeTiebreakerUsed = true
    const homeWinsTiebreaker = input.rng.chance(0.5)
    recordTiebreakerPoint(state, homeWinsTiebreaker ? 'home' : 'away')
    state.events.push({ type: 'endOfPeriod', period: 7 })
  }

  state.clock.timeRemainingSeconds = 0
  state.status = 'final'
  state.homeWin = state.score.home > state.score.away

  const keyPlays = rankKeyPlays(state.events, 5, state)
  return { gameState: state, keyPlays, gameFatigue: state.gameFatigue }
}

async function playPeriod(
  state: GameState,
  input: SimulateGameInput,
  homeById: Map<string, Player>,
  awayById: Map<string, Player>,
  period: number,
): Promise<void> {
  const periodSeconds = period >= 5 ? OT_SECONDS : QUARTER_SECONDS
  let secondsRemaining = periodSeconds
  let possessionsThisHalf = 0
  let lastPlayWasSteal = false

  while (secondsRemaining > 0 && possessionsThisHalf < MAX_POSSESSIONS_PER_PERIOD) {
    const offTeam = state.possession
    const defTeam = offTeam === 'home' ? 'away' : 'home'
    const onCourt = state.lineupOnCourt[offTeam]
    const defOnCourt = state.lineupOnCourt[defTeam]
    const offActive = onCourt.map((id) =>
      (offTeam === 'home' ? homeById : awayById).get(id),
    ).filter((p): p is Player => Boolean(p))
    const defActive = defOnCourt.map((id) =>
      (defTeam === 'home' ? homeById : awayById).get(id),
    ).filter((p): p is Player => Boolean(p))

    if (offActive.length === 0 || defActive.length === 0) {
      secondsRemaining -= 5
      state.possession = defTeam
      continue
    }

    const type = selectPossessionType(input.rng)
    const offTeamObj = offTeam === 'home' ? input.home : input.away
    const defTeamObj = offTeam === 'home' ? input.away : input.home
    const offRate = strategyThreePointRate(
      offActive,
      offTeamObj.strategy,
      input.era,
    )

    const clutch = isClutch(
      period,
      secondsRemaining,
      state.score.home,
      state.score.away,
    )
    const margin = Math.abs(state.score.home - state.score.away)

    const scoreDiff = offTeam === 'home'
      ? state.score.home - state.score.away
      : state.score.away - state.score.home
    const { factor: clockFactor } = getClockFactor(
      period,
      secondsRemaining,
      scoreDiff,
      offTeam === 'home',
    )

    if (clockFactor === 'runOutClock') {
      distributeMinutes(state, secondsRemaining)
      secondsRemaining = 0
      state.possession = defTeam
      possessionsThisHalf++
      continue
    }

    const foulsUntilBonus = getFoulsUntilBonus(state, defTeam)
    if (shouldIntentionalFoul(period, secondsRemaining, state.score[offTeam], state.score[defTeam], foulsUntilBonus)) {
      const fouler = defActive[Math.floor(input.rng.next() * defActive.length)]
      const ftShooter = offActive[0]
      if (fouler && ftShooter) {
        state.fouls[defTeam].team++
        state.teamFoulsThisQuarter[defTeam]++
        state.fouls[defTeam].byPlayer[fouler.id] = (state.fouls[defTeam].byPlayer[fouler.id] ?? 0) + 1
        state.events.push({
          type: 'foul',
          playerId: fouler.id,
          teamId: defTeam === 'home' ? input.home.id : input.away.id,
          kind: 'non_shooting',
          onShot: false,
          period,
          timeRemainingSeconds: secondsRemaining,
        })
        const ftPct = ftShooter.ratings.freeThrow
        let ftPoints = 0
        for (let i = 0; i < 2; i++) {
          const made = input.rng.chance(ftPct / 100)
          if (made) ftPoints++
          state.events.push({
            type: 'freeThrow',
            playerId: ftShooter.id,
            teamId: offTeam === 'home' ? input.home.id : input.away.id,
            attempt: i + 1,
            made,
            period,
            timeRemainingSeconds: secondsRemaining,
          })
        }
        if (offTeam === 'home') state.score.home += ftPoints
        else state.score.away += ftPoints
        state.possession = defTeam
        state.arrow = offTeam
        possessionsThisHalf++
        continue
      }
    }

    const homePlayerIds = state.lineupOnCourt.home.filter(id => input.homePlayers.some(p => p.id === id))
    const awayPlayerIds = state.lineupOnCourt.away.filter(id => input.awayPlayers.some(p => p.id === id))
    const techTeam = input.rng.chance(0.5) ? 'home' : 'away'
    const techPlayerIds = techTeam === 'home' ? homePlayerIds : awayPlayerIds
    const tech = resolveTechnical(input.rng, techPlayerIds)
    if (tech) {
      const techTeamId = techTeam === 'home' ? input.home.id : input.away.id
      const ftTeam = techTeam === 'home' ? 'away' : 'home'
      const ftTeamId = ftTeam === 'home' ? input.home.id : input.away.id
      const ftPlayers = ftTeam === 'home' ? input.homePlayers : input.awayPlayers
      const ftShooter = ftPlayers[0]
      state.events.push({
        type: 'foul',
        playerId: tech.playerId,
        teamId: techTeamId,
        kind: 'technical',
        onShot: false,
        period,
        timeRemainingSeconds: secondsRemaining,
      })
      state.fouls[techTeam].byPlayer[tech.playerId] = (state.fouls[techTeam].byPlayer[tech.playerId] ?? 0) + 1
      const ps = state.playerStats[tech.playerId]
      if (ps) ps.technicals = (ps.technicals ?? 0) + 1
      if (ps && isTechnicalEjection(ps.technicals)) {
        const sub = pickEjectionSub(state, tech.playerId, techTeam, techTeamId, period, secondsRemaining)
        if (sub) applySubs(state, [sub])
      }
      if (ftShooter) {
        const ftPct = ftShooter.ratings.freeThrow / 100
        const made = input.rng.chance(ftPct)
        if (made) {
          if (ftTeam === 'home') state.score.home++
          else state.score.away++
        }
        state.events.push({
          type: 'freeThrow',
          playerId: ftShooter.id,
          teamId: ftTeamId,
          attempt: 1,
          made,
          period,
          timeRemainingSeconds: secondsRemaining,
        })
      }
    }

    const offenseLineupForSim = clutch && margin <= 5 && offTeam === 'home'
      ? swapToClosing(state, offTeam, input.homeLineup, homeById)
      : clutch && margin <= 5 && offTeam === 'away'
        ? swapToClosing(state, offTeam, input.awayLineup, awayById)
        : offActive

    if (clutch && shouldCallTimeout(period, secondsRemaining, margin)) {
      state.events.push({
        type: 'substitution',
        teamId: offTeam === 'home' ? input.home.id : input.away.id,
        out: '',
        in: '',
        period,
        timeRemainingSeconds: secondsRemaining,
      })
    }

    const defenseLineupForSim = clutch && margin <= 5 && defTeam === 'home'
      ? swapToClosing(state, defTeam, input.homeLineup, homeById)
      : clutch && margin <= 5 && defTeam === 'away'
        ? swapToClosing(state, defTeam, input.awayLineup, awayById)
        : defActive

    const result = resolvePossession(
      {
        offense: offenseLineupForSim,
        defense: defenseLineupForSim,
        offenseTeamId: offTeam === 'home' ? input.home.id : input.away.id,
        defenseTeamId: defTeam === 'home' ? input.home.id : input.away.id,
        homeOffense: offTeam === 'home',
        closingMinutes: clutch,
        fatigueByPlayer: state.gameFatigue,
        fatigueEnabled: input.fatigueEnabled,
        era: input.era,
        threePointRate: offRate,
        possessionType: type,
        period,
        timeRemainingSeconds: secondsRemaining,
        baseTimeSeconds: BASE_TIME_SECONDS,
        minutesPlayed: state.minutesPlayed,
        offenseStrategy: offTeamObj.strategy,
        defenseStrategy: defTeamObj.strategy,
        teamChemistry: offTeamObj.chemistry,
        homeScore: state.score.home,
        awayScore: state.score.away,
        clockFactor,
        foulsUntilBonus: getFoulsUntilBonus(state, defTeam),
        shooterStreak: offenseLineupForSim[0] ? (state.playerStreaks[offenseLineupForSim[0].id] ?? { consecutiveMakes: 0, consecutiveMisses: 0 }) : undefined,
        teamStreak: state.teamStreaks[offTeam === 'home' ? 0 : 1],
        eruptionPlayerId: state.eruptionPlayerId,
        stinkerPlayerId: state.stinkerPlayerId,
        momentumShotBonus: getMomentumModifier(state.momentum[offTeam === 'home' ? 0 : 1]).shot,
        momentumTovBonus: getMomentumModifier(state.momentum[offTeam === 'home' ? 0 : 1]).tov,
        playerStreaks: state.playerStreaks,
        lastPlayWasSteal,
      },
      input.rng,
    )

    state.events.push(...result.events)
    if (result.points > 0) {
      if (offTeam === 'home') state.score.home += result.points
      else state.score.away += result.points
    }

    if (result.shotMade !== undefined && result.shooterId) {
      const shooterStreak = state.playerStreaks[result.shooterId] ?? { consecutiveMakes: 0, consecutiveMisses: 0 }
      updatePlayerStreaks(shooterStreak, result.shotMade)
      state.playerStreaks[result.shooterId] = shooterStreak
      const teamIdx = offTeam === 'home' ? 0 : 1
      updateTeamStreaks(state.teamStreaks[teamIdx], result.shotMade)

      const isHome = offTeam === 'home'
      const oppTeamIdx = teamIdx === 0 ? 1 : 0
      if (result.shotMade) {
        const zone = result.shotZone
        const eventType = zone && zone.endsWith('three') ? 'made_3' : 'made_2'
        applyMomentum(state as unknown as MomentumState, teamIdx, eventType, isHome)
        addRunPoints(state as unknown as MomentumState, teamIdx, result.points, secondsRemaining)
        checkForRun(state as unknown as MomentumState, teamIdx, secondsRemaining)
      } else {
        applyMomentum(state as unknown as MomentumState, oppTeamIdx, 'miss_opponent', !isHome)
      }
      if (result.turnoverType) {
        applyMomentum(state as unknown as MomentumState, oppTeamIdx, 'tov_opponent', !isHome)
      }
      if (result.fouled) {
        applyMomentum(state as unknown as MomentumState, teamIdx, 'and1', isHome)
      }
    }

    decayMomentum(state as unknown as MomentumState, result.timeElapsedSeconds)

    for (const ev of result.events) {
      if (ev.type === 'foul' && ev.kind !== 'offensive' && ev.kind !== 'technical') {
        const foulTeam = ev.teamId === input.home.id ? 'home' : 'away'
        state.teamFoulsThisQuarter[foulTeam]++
        state.fouls[foulTeam].byPlayer[ev.playerId] = (state.fouls[foulTeam].byPlayer[ev.playerId] ?? 0) + 1
        const playerFouls = state.fouls[foulTeam].byPlayer[ev.playerId] ?? 0
        if (playerFouls >= FOUL_OUT_LIMIT) {
          const sub = pickEjectionSub(state, ev.playerId, foulTeam, ev.teamId, period, secondsRemaining)
          if (sub) applySubs(state, [sub])
        }
      }
    }

    if (input.injuriesEnabled) {
      for (const ev of result.events) {
        if (ev.type === 'foul' && ev.kind === 'shooting' && ev.fouledPlayerId) {
          const isAtRim = result.shotZone === 'at_rim'
          if (checkInjuryOnContact(input.rng, isAtRim)) {
            const injuredTeam = ev.teamId === input.home.id ? 'home' : 'away'
            const injuredPlayers = injuredTeam === 'home' ? input.homePlayers : input.awayPlayers
            const injuredPlayer = injuredPlayers.find(p => p.id === ev.fouledPlayerId)
            if (injuredPlayer && injuredPlayer.health.status !== 'season_ending') {
              const injury = rollForInjury(injuredPlayer, { minutes: state.minutesPlayed[injuredPlayer.id] ?? 0, fatigue: state.gameFatigue[injuredPlayer.id] ?? 0, contact: true, backToBack: false, injuriesEnabled: true }, input.rng, state.date)
              if (injury) {
                injuredPlayer.health = applyInjuryToHealth(injuredPlayer.health, injury)
              }
            }
          }
        }
      }
    }

    secondsRemaining = Math.max(0, secondsRemaining - result.timeElapsedSeconds)

    const isDeadBall = result.turnoverType || result.fouled || result.endOfPeriod || result.possessionChange
    if (isDeadBall) {
      const subsHome = planSubstitutionsFor(state, input, 'home', period, secondsRemaining, homeById)
      applySubs(state, subsHome)
      const subsAway = planSubstitutionsFor(state, input, 'away', period, secondsRemaining, awayById)
      applySubs(state, subsAway)

      if (isBlowout(state)) {
        const blowoutSubsHome = planBlowoutSubs(state, input, 'home', period, secondsRemaining)
        applySubs(state, blowoutSubsHome)
        const blowoutSubsAway = planBlowoutSubs(state, input, 'away', period, secondsRemaining)
        applySubs(state, blowoutSubsAway)
      }
    }

    distributeMinutes(state, result.timeElapsedSeconds)
    if (input.fatigueEnabled) {
      const crunchTime = period >= 4 && secondsRemaining <= CRUNCH_TIME_MINUTES * 60
      updateGameFatigue(state, input, result.timeElapsedSeconds / 60, crunchTime)
    }

    if (result.possessionChange) {
      state.possession = defTeam
      state.arrow = offTeam
      possessionsThisHalf++
    }

    lastPlayWasSteal = result.stealerId !== undefined

    if (secondsRemaining <= 3 && secondsRemaining > 0 && clockFactor !== 'runOutClock') {
      const heavePlayer = offenseLineupForSim[0]
      if (heavePlayer) {
        const heavePct = 0.05
        const made = input.rng.chance(heavePct)
        const pts = made ? 3 : 0
        if (offTeam === 'home') state.score.home += pts
        else state.score.away += pts
        state.events.push({
          type: 'shot',
          playerId: heavePlayer.id,
          teamId: offTeam === 'home' ? input.home.id : input.away.id,
          zone: 'above_break_three',
          shotType: 'pull_up',
          made,
          period,
          timeRemainingSeconds: secondsRemaining,
          impact: made ? 90 : 0,
        })
        secondsRemaining = 0
      }
    }

    if (input.simSpeed === 'normal' && input.onTick) {
      await input.onTick(buildLiveGameSnapshot(state))
      await simDelay(input.possessionDelayMs ?? LIVE_SIM_POSSESSION_DELAY_MS)
    }
  }

  state.clock.timeRemainingSeconds = secondsRemaining
}

function swapToClosing(
  state: GameState,
  team: 'home' | 'away',
  lineup: LineupSettings,
  byId: Map<string, Player>,
): Player[] {
  if (lineup.closingLineup.length !== 5) {
    return state.lineupOnCourt[team]
      .map((id) => byId.get(id))
      .filter((p): p is Player => Boolean(p))
  }
  const desired: Player[] = []
  for (const id of lineup.closingLineup) {
    const p = byId.get(id)
    if (p && !isInjured(p)) desired.push(p)
  }
  if (desired.length < 5) {
    const fallback = state.lineupOnCourt[team]
      .map((id) => byId.get(id))
      .filter((p): p is Player => Boolean(p))
    for (const p of fallback) {
      if (desired.length >= 5) break
      if (!desired.includes(p)) desired.push(p)
    }
  }
  state.lineupOnCourt[team] = desired.slice(0, 5).map((p) => p.id)
  return desired.slice(0, 5)
}

function planSubstitutionsFor(
  state: GameState,
  input: SimulateGameInput,
  team: 'home' | 'away',
  period: number,
  timeRemainingSeconds: number,
  byId: Map<string, Player>,
): PlannedSub[] {
  const lineup = team === 'home' ? input.homeLineup : input.awayLineup
  const teamId = team === 'home' ? input.home.id : input.away.id
  const closingMargin = Math.abs(state.score.home - state.score.away) <= 5
  return planSubstitutions({
    team,
    teamId,
    lineup,
    players: byId,
    onCourt: state.lineupOnCourt[team],
    minutesPlayed: state.minutesPlayed,
    period,
    timeRemainingSeconds,
    foulsByPlayer: state.fouls[team].byPlayer,
    closingMarginLeq5: closingMargin,
  })
}

function applySubs(
  state: GameState,
  subs: PlannedSub[],
): void {
  for (const sub of subs) {
    const isHome = sub.teamId === state.homeTeamId
    const court = isHome ? state.lineupOnCourt.home : state.lineupOnCourt.away
    if (court.includes(sub.in)) continue
    const idx = court.indexOf(sub.out)
    if (idx === -1) continue
    court[idx] = sub.in
    state.playerStats[sub.in] ??= emptyPlayerGameStats(
      sub.in,
      sub.teamId,
      state.startingLineups.home.includes(sub.in) ||
        state.startingLineups.away.includes(sub.in),
    )
    state.minutesPlayed[sub.in] ??= 0
    state.minutesPlayed[sub.out] ??= 0
    state.fouls[isHome ? 'home' : 'away'].byPlayer[sub.in] ??= 0
    state.events.push({
      type: 'substitution',
      teamId: sub.teamId,
      out: sub.out,
      in: sub.in,
      period: sub.period,
      timeRemainingSeconds: sub.timeRemainingSeconds,
    })
  }
}

function updateGameFatigue(
  state: GameState,
  input: SimulateGameInput,
  minutesDelta: number,
  crunchTime = false,
): void {
  for (const id of state.lineupOnCourt.home) {
    const p = input.homePlayers.find((pl) => pl.id === id)
    if (!p) continue
    state.gameFatigue[id] = accumulateGameFatigue(
      p,
      state.gameFatigue[id] ?? p.fatigue,
      minutesDelta,
      input.home.strategy.offense.pace,
      crunchTime,
    )
  }
  for (const id of state.lineupOnCourt.away) {
    const p = input.awayPlayers.find((pl) => pl.id === id)
    if (!p) continue
    state.gameFatigue[id] = accumulateGameFatigue(
      p,
      state.gameFatigue[id] ?? p.fatigue,
      minutesDelta,
      input.away.strategy.offense.pace,
      crunchTime,
    )
  }
}

function distributeMinutes(state: GameState, seconds: number): void {
  const minutes = seconds / 60
  for (const id of state.lineupOnCourt.home) {
    state.minutesPlayed[id] = Math.min(48, (state.minutesPlayed[id] ?? 0) + minutes)
  }
  for (const id of state.lineupOnCourt.away) {
    state.minutesPlayed[id] = Math.min(48, (state.minutesPlayed[id] ?? 0) + minutes)
  }
}

function playerMap(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]))
}

function planBlowoutSubs(
  state: GameState,
  input: SimulateGameInput,
  team: 'home' | 'away',
  period: number,
  timeRemainingSeconds: number,
): PlannedSub[] {
  const subs: PlannedSub[] = []
  const lineup = team === 'home' ? input.homeLineup : input.awayLineup
  const teamId = team === 'home' ? input.home.id : input.away.id
  const onCourt = state.lineupOnCourt[team]
  const starters = new Set(lineup.starters)

  for (const id of onCourt) {
    if (!starters.has(id)) continue
    const mins = state.minutesPlayed[id] ?? 0
    if (mins >= 24) {
      const bench = lineup.bench.filter(bid => !onCourt.includes(bid))
      const firstBench = bench[0]
      if (firstBench) {
        subs.push({
          teamId,
          out: id,
          in: firstBench,
          period,
          timeRemainingSeconds,
        })
      }
    }
  }
  return subs
}

function isBlowout(state: GameState): boolean {
  if (state.clock.period < 4) return false
  const diff = Math.abs(state.score.home - state.score.away)
  const clock = state.clock.timeRemainingSeconds
  return (
    (diff >= BLOWOUT_MARGIN_Q4_LATE_720 && clock < 720) ||
    (diff >= BLOWOUT_MARGIN_Q4_LATE_540 && clock < 540) ||
    (diff >= BLOWOUT_MARGIN_Q4_LATE_420 && clock < 420) ||
    (diff >= BLOWOUT_MARGIN_Q4_LATE_180 && clock < 180) ||
    (diff >= BLOWOUT_MARGIN_Q4_LATE_60 && clock < 60)
  )
}

function ensureFive(
  starters: string[],
  players: Player[],
  byId: Map<string, Player>,
): string[] {
  if (starters.length === 5) return [...starters]
  const fallback: string[] = []
  for (const id of starters) {
    if (byId.has(id)) fallback.push(id)
  }
  if (fallback.length === 5) return fallback
  for (const p of players) {
    if (fallback.length >= 5) break
    if (!fallback.includes(p.id)) fallback.push(p.id)
  }
  return fallback.slice(0, 5)
}

async function simDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function recordTiebreakerPoint(
  state: GameState,
  winningSide: 'home' | 'away',
): void {
  const teamId = winningSide === 'home' ? state.homeTeamId : state.awayTeamId
  const playerId = state.lineupOnCourt[winningSide][0]
  if (!playerId) return

  if (winningSide === 'home') {
    state.score.home += 1
  } else {
    state.score.away += 1
  }

  state.events.push({
    type: 'freeThrow',
    playerId,
    teamId,
    attempt: 1,
    made: true,
    period: 7,
    timeRemainingSeconds: 0,
  })
}

function getFoulsUntilBonus(state: GameState, team: 'home' | 'away'): number {
  const foulsThisQuarter = state.teamFoulsThisQuarter[team]
  const isOT = state.clock.period >= 5
  const isLastTwoMin = state.clock.period <= 4 && state.clock.timeRemainingSeconds <= 120
  const foulsNeeded = isOT
    ? BONUS_FOULS_OT
    : isLastTwoMin
      ? BONUS_FOULS_LAST_TWO_MIN
      : BONUS_FOULS_REGULATION
  return Math.max(0, foulsNeeded - foulsThisQuarter)
}

function pickEjectionSub(
  state: GameState,
  ejectedId: string,
  team: 'home' | 'away',
  teamId: string,
  period: number,
  timeRemainingSeconds: number,
): PlannedSub | null {
  const onCourt = state.lineupOnCourt[team]
  const idx = onCourt.indexOf(ejectedId)
  if (idx === -1) return null
  const allPlayerIds = Object.keys(state.playerStats)
  const bench = allPlayerIds.filter(id => !onCourt.includes(id) && id !== ejectedId)
  if (bench.length === 0) return null
  const replacement = bench[0]!
  return {
    teamId,
    out: ejectedId,
    in: replacement,
    period,
    timeRemainingSeconds,
  }
}
