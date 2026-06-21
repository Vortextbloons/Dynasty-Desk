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
import {
  QUARTER_SECONDS,
  OT_SECONDS,
  MAX_POSSESSIONS_PER_PERIOD,
  SUB_INTERVAL_SECONDS,
  BASE_TIME_SECONDS,
} from '@/game/sim/simConstants'

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
    arena: `${input.home.city} Arena`,
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
    injuriesEnabled: input.injuriesEnabled,
    fatigueEnabled: input.fatigueEnabled,
    overtimeOccurred: false,
    overtimeTiebreakerUsed: false,
    homeWin: null,
  }

  let possessionsSinceYield = 0
  for (let period = 1 as 1 | 2 | 3 | 4; period <= 4; period = (period + 1) as 1 | 2 | 3 | 4) {
    state.clock = { period, timeRemainingSeconds: QUARTER_SECONDS }
    state.events.push({ type: 'endOfPeriod', period: period - 1 })
    playPeriod(state, input, homeById, awayById, period)
    await yieldIfNormal(input.simSpeed, ++possessionsSinceYield)
  }

  let otPeriod = 5 as 5 | 6 | 7
  while (state.score.home === state.score.away && otPeriod <= 7) {
    state.overtimeOccurred = true
    state.clock = { period: otPeriod, timeRemainingSeconds: OT_SECONDS }
    state.events.push({ type: 'endOfPeriod', period: otPeriod - 1 })
    playPeriod(state, input, homeById, awayById, otPeriod)
    otPeriod = (otPeriod + 1) as 5 | 6 | 7
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

  const keyPlays = rankKeyPlays(state.events, 5)
  return { gameState: state, keyPlays, gameFatigue: state.gameFatigue }
}

function playPeriod(
  state: GameState,
  input: SimulateGameInput,
  homeById: Map<string, Player>,
  awayById: Map<string, Player>,
  period: number,
): void {
  const periodSeconds = period >= 5 ? OT_SECONDS : QUARTER_SECONDS
  let secondsRemaining = periodSeconds
  let possessionsThisHalf = 0
  let lastSubHome = 0
  let lastSubAway = 0

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
    const offenseLineupForSim = clutch && margin <= 5 && offTeam === 'home'
      ? swapToClosing(state, offTeam, input.homeLineup, homeById)
      : clutch && margin <= 5 && offTeam === 'away'
        ? swapToClosing(state, offTeam, input.awayLineup, awayById)
        : offActive

    const result = resolvePossession(
      {
        offense: offenseLineupForSim,
        defense: defActive,
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
      },
      input.rng,
    )

    state.events.push(...result.events)
    if (result.points > 0) {
      if (offTeam === 'home') state.score.home += result.points
      else state.score.away += result.points
    }

    secondsRemaining = Math.max(0, secondsRemaining - result.timeElapsedSeconds)

    const elapsed = periodSeconds - secondsRemaining
    if (elapsed - lastSubHome >= SUB_INTERVAL_SECONDS) {
      const subs = planSubstitutionsFor(state, input, 'home', period, secondsRemaining, homeById)
      applySubs(state, subs)
      lastSubHome = elapsed
    }
    if (elapsed - lastSubAway >= SUB_INTERVAL_SECONDS) {
      const subs = planSubstitutionsFor(state, input, 'away', period, secondsRemaining, awayById)
      applySubs(state, subs)
      lastSubAway = elapsed
    }

    distributeMinutes(state, result.timeElapsedSeconds)
    if (input.fatigueEnabled) {
      updateGameFatigue(state, input, result.timeElapsedSeconds / 60)
    }

    if (result.possessionChange) {
      state.possession = defTeam
      state.arrow = offTeam
      possessionsThisHalf++
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
): void {
  for (const id of state.lineupOnCourt.home) {
    const p = input.homePlayers.find((pl) => pl.id === id)
    if (!p) continue
    state.gameFatigue[id] = accumulateGameFatigue(
      p,
      state.gameFatigue[id] ?? p.fatigue,
      minutesDelta,
      input.home.strategy.offense.pace,
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

async function yieldIfNormal(
  speed: 'instant' | 'normal',
  count: number,
): Promise<void> {
  if (speed === 'normal' && count % 5 === 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
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
