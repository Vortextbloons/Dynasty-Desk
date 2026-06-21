import type { Player } from '@/game/models/player'
import type { TeamStrategy } from '@/game/models/team'
import type { ShotZone, ShotType, PossessionResult, SimEvent } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import { resolveShot, selectZone, type ShotContext, type ResolvedShot } from '@/game/sim/shotModel'
import { turnoverChance, resolveTurnover } from '@/game/sim/turnoverModel'
import { resolveRebound } from '@/game/sim/reboundModel'
import { shootingFoulChance, resolveFoul } from '@/game/sim/foulModel'
import {
  isThreePointZone,
  threePointRateForTeam,
} from '@/game/sim/shotZones'
import type { EraConfig } from '@/game/models/eraConfig'
import { applyFatiguePenalty } from '@/game/sim/fatigueEngine'
import { applyClutchAdjustments, clutchUsageWeight } from '@/game/sim/clutchEngine'
import { moraleConsistencyModifier } from '@/game/sim/moraleEngine'
import { chemistryEffects } from '@/game/sim/chemistryEngine'
import {
  initialShotClock,
  shotClockHandler,
} from '@/game/sim/shotClock'
import { clamp } from '@/lib/utils'
import { applyStrategyToPossession } from '@/game/sim/strategyEngine'
import {
  TRANSITION_PROBABILITY,
  NON_SHOOTING_FOUL_RATE,
} from '@/game/sim/simConstants'
import type { ClockFactor } from '@/game/sim/clockEngine'
import { isFinalShotAttempt } from '@/game/sim/clockEngine'
import type { PlayerStreaks, TeamStreaks } from '@/game/sim/streakTracker'
import { hotHandModifier, teamStreakModifier as teamStreakMod, streakUsageModifier } from '@/game/sim/streakTracker'
import {
  consistencyVariance as consistencyVarianceFn,
} from '@/game/sim/randomEventsEngine'

export interface PossessionInput {
  offense: Player[]
  defense: Player[]
  offenseTeamId: string
  defenseTeamId: string
  homeOffense: boolean
  closingMinutes: boolean
  fatigueByPlayer: Record<string, number>
  fatigueEnabled: boolean
  era: EraConfig
  threePointRate: number
  possessionType: 'half_court' | 'transition'
  period: number
  timeRemainingSeconds: number
  baseTimeSeconds: number
  minutesPlayed: Record<string, number>
  offenseStrategy: TeamStrategy
  defenseStrategy: TeamStrategy
  teamChemistry: number
  homeScore: number
  awayScore: number
  clockFactor: ClockFactor
  foulsUntilBonus: number
  shooterStreak?: PlayerStreaks
  teamStreak?: TeamStreaks
  eruptionPlayerId?: string | null
  stinkerPlayerId?: string | null
  momentumShotBonus?: number
  momentumTovBonus?: number
  playerStreaks?: Record<string, PlayerStreaks>
  lastPlayWasSteal?: boolean
}

export function selectPossessionType(rng: SeededRandom): 'half_court' | 'transition' {
  return rng.chance(TRANSITION_PROBABILITY) ? 'transition' : 'half_court'
}

export function selectPrimaryPlayer(
  offense: readonly Player[],
  minutesPlayed: Record<string, number>,
  rng: SeededRandom,
  clutch = false,
  playerStreaks?: Record<string, PlayerStreaks>,
): Player {
  if (offense.length === 0) {
    throw new Error('selectPrimaryPlayer: empty offense')
  }
  const weights = offense.map((p) => {
    const base = clutch
      ? clutchUsageWeight(p, true)
      : Math.max(2, p.tendencies.usageRate)
    const minutes = Math.max(1, (minutesPlayed[p.id] ?? 1))
    const streakMult = playerStreaks ? streakUsageModifier(playerStreaks[p.id] ?? { consecutiveMakes: 0, consecutiveMisses: 0 }) : 1
    return base * Math.sqrt(minutes) * streakMult
  })
  return rng.weightedPick(offense, weights)
}

export function selectDefender(
  primary: Player,
  defense: readonly Player[],
  rng: SeededRandom,
): Player {
  if (defense.length === 0) {
    throw new Error('selectDefender: empty defense')
  }
  const weights = defense.map((d) => {
    if (d.position === primary.position) return 1.8
    if (d.ratings.perimeterDefense >= 75) return 1.4
    return 1
  })
  return rng.weightedPick(defense, weights)
}

export function selectShotType(
  possessionType: 'half_court' | 'transition',
  primary: Player,
  rng: SeededRandom,
): ShotType {
  if (possessionType === 'transition') return 'transition'
  const types: ShotType[] = ['catch_and_shoot', 'pull_up', 'drive', 'post_up']
  const weights: number[] = types.map((t): number => {
    switch (t) {
      case 'catch_and_shoot':
        return primary.tendencies.spotUpRate
      case 'pull_up':
        return primary.tendencies.isolationRate * 1.5
      case 'drive':
        return primary.tendencies.driveRate * 1.4
      case 'post_up':
        return primary.tendencies.postUpRate * 2
      default:
        return 0
    }
  })
  return rng.weightedPick(types, weights)
}

function pickAssister(
  offense: readonly Player[],
  shooterId: string,
  shotType: ShotType,
  rng: SeededRandom,
): string | undefined {
  if (shotType !== 'catch_and_shoot' && shotType !== 'transition' && shotType !== 'pull_up') return undefined
  if (!rng.chance(shotType === 'pull_up' ? 0.30 : 0.60)) return undefined
  const passers = offense.filter((p) => p.id !== shooterId && p.ratings.passing >= 60)
  if (passers.length === 0) return undefined
  const weights = passers.map((p) => Math.max(1, p.ratings.passing))
  return rng.weightedPick(passers, weights).id
}

function pickBlocker(
  defense: readonly Player[],
  zone: ShotZone,
  shotType: ShotType,
  rng: SeededRandom,
): string | undefined {
  if (zone === 'long_mid' || zone === 'corner_three') return undefined
  const candidates = defense.filter((d) => {
    if (zone === 'at_rim') return d.ratings.block >= 40
    if (zone === 'short_mid') return d.ratings.block >= 55
    return d.ratings.perimeterDefense >= 60
  })
  if (candidates.length === 0) return undefined
  const baseChance = zone === 'at_rim' ? 0.12 : zone === 'short_mid' ? 0.08 : 0.06
  const typeBonus = (shotType === 'drive' || shotType === 'putback') ? 0.04 : 0
  const chance = baseChance + typeBonus
  if (!rng.chance(chance)) return undefined
  const weights = candidates.map((d) => Math.max(1, d.ratings.block))
  return rng.weightedPick(candidates, weights).id
}

export function resolvePossession(
  input: PossessionInput,
  rng: SeededRandom,
): PossessionResult {
  const events: SimEvent[] = []
  const strategyAdj = applyStrategyToPossession(input.offenseStrategy)
  const chemFx = chemistryEffects(input.teamChemistry)

  const shotClock = initialShotClock(
    input.lastPlayWasSteal ? 'transition' : input.possessionType,
  )
  const clockResult = shotClockHandler(
    shotClock,
    {
      shotClockRemaining: shotClock,
      period: input.period,
      timeRemainingSeconds: input.timeRemainingSeconds,
      possessionType: input.possessionType,
    },
    rng,
    input.clockFactor,
  )

  if (clockResult.violation) {
    const primary = selectPrimaryPlayer(
      input.offense,
      input.minutesPlayed,
      rng,
      input.closingMinutes,
    )
    events.push({
      type: 'turnover',
      playerId: primary.id,
      teamId: input.offenseTeamId,
      turnoverType: 'shot_clock_violation',
      period: input.period,
      timeRemainingSeconds: input.timeRemainingSeconds,
      impact: 30,
    })
    return {
      points: 0,
      timeElapsedSeconds: clockResult.timeElapsed,
      events,
      possessionChange: true,
      endOfPeriod: false,
      turnoverType: 'shot_clock_violation',
      shooterId: primary.id,
    }
  }

  const primary = selectPrimaryPlayer(
    input.offense,
    input.minutesPlayed,
    rng,
    input.closingMinutes,
    input.playerStreaks,
  )

  const scoreDiff = input.homeOffense
    ? input.homeScore - input.awayScore
    : input.awayScore - input.homeScore
  const finalShot = isFinalShotAttempt(input.timeRemainingSeconds, scoreDiff)
  let shooter = primary
  if (finalShot) {
    const clutchPlayers = input.offense
      .filter(p => p.ratings.clutch >= 65)
      .sort((a, b) => b.ratings.clutch - a.ratings.clutch)
    if (clutchPlayers.length > 0) {
      shooter = clutchPlayers[0]!
    }
  }

  const defender = selectDefender(shooter, input.defense, rng)
  const shotType = selectShotType(input.possessionType, shooter, rng)
  const zone = selectZone(shooter, input.threePointRate, input.possessionType === 'transition', rng)

  const toChance = turnoverChance(shooter, input.defense) +
    strategyAdj.turnoverChanceBonus +
    (input.fatigueEnabled
      ? -applyFatiguePenalty(input.fatigueByPlayer[shooter.id] ?? 0, 'turnovers')
      : 0) +
    (input.momentumTovBonus ?? 0)

  const foulChance = shootingFoulChance(shooter, defender, zone) +
    strategyAdj.foulChanceBonus

  if (rng.chance(clamp(toChance, 0.05, 0.35))) {
    const t = resolveTurnover(shooter, input.defense, rng)
    const turnoverEvent: SimEvent = {
      type: 'turnover',
      playerId: t.playerId,
      teamId: input.offenseTeamId,
      turnoverType: t.turnoverType,
      period: input.period,
      timeRemainingSeconds: input.timeRemainingSeconds,
      impact: t.impact,
      ...(t.stolenBy ? { stolenBy: t.stolenBy } : {}),
    }
    events.push(turnoverEvent)
    return {
      points: 0,
      timeElapsedSeconds: clockResult.timeElapsed,
      events,
      possessionChange: true,
      endOfPeriod: false,
      turnoverType: t.turnoverType,
      shooterId: t.playerId,
      stealerId: t.stolenBy,
    }
  }

  if (rng.chance(NON_SHOOTING_FOUL_RATE)) {
    const foul = resolveFoul(defender, shooter, false, rng)
    if (foul.kind === 'offensive') {
      events.push({
        type: 'turnover',
        playerId: foul.playerId,
        teamId: input.offenseTeamId,
        turnoverType: 'offensive_foul',
        period: input.period,
        timeRemainingSeconds: input.timeRemainingSeconds,
        impact: 35,
      })
      return {
        points: 0,
        timeElapsedSeconds: clockResult.timeElapsed,
        events,
        possessionChange: true,
        endOfPeriod: false,
        turnoverType: 'offensive_foul',
        shooterId: foul.playerId,
      }
    }

    events.push({
      type: 'foul',
      playerId: foul.playerId,
      teamId: input.defenseTeamId,
      kind: foul.kind === 'flagrant' ? 'flagrant' : 'non_shooting',
      onShot: false,
      period: input.period,
      timeRemainingSeconds: input.timeRemainingSeconds,
      ...(foul.fouledPlayerId ? { fouledPlayerId: foul.fouledPlayerId } : {}),
    })

    if (input.foulsUntilBonus <= 1 || foul.kind === 'flagrant') {
      const ftCount = foul.kind === 'flagrant' ? 2 : 2
      let points = 0
      for (let attempt = 1; attempt <= ftCount; attempt++) {
        const ftPct = shooter.ratings.freeThrow / 100
        const made = rng.chance(ftPct)
        if (made) points++
        events.push({
          type: 'freeThrow',
          playerId: shooter.id,
          teamId: input.offenseTeamId,
          attempt,
          made,
          period: input.period,
          timeRemainingSeconds: input.timeRemainingSeconds,
        })
      }
      return {
        points,
        timeElapsedSeconds: clockResult.timeElapsed,
        events,
        possessionChange: true,
        endOfPeriod: false,
        fouled: true,
        shooterId: shooter.id,
        defenderId: defender.id,
      }
    }

    return {
      points: 0,
      timeElapsedSeconds: clockResult.timeElapsed,
      events,
      possessionChange: false,
      endOfPeriod: false,
      fouled: true,
      shooterId: shooter.id,
      defenderId: defender.id,
    }
  }

  if (rng.chance(foulChance)) {
    const foul = resolveFoul(defender, shooter, true, rng)
    const foulEvent: SimEvent = {
      type: 'foul',
      playerId: foul.playerId,
      teamId: input.defenseTeamId,
      kind: 'shooting',
      onShot: true,
      period: input.period,
      timeRemainingSeconds: input.timeRemainingSeconds,
      ...(foul.fouledPlayerId ? { fouledPlayerId: foul.fouledPlayerId } : {}),
    }
    events.push(foulEvent)

    const foulShotCtx: ShotContext = {
      shooter,
      defender,
      offenseLineup: input.offense,
      defenseLineup: input.defense,
      zone,
      shotType,
      homeOffense: input.homeOffense,
      inClosingMinutes: input.closingMinutes,
      shooterFatigue: input.fatigueEnabled ? (input.fatigueByPlayer[shooter.id] ?? 0) : 0,
      lateShot: clockResult.lateShot,
      moraleModifier: moraleConsistencyModifier(shooter.morale),
      clutchModifier: applyClutchAdjustments(shooter, input.closingMinutes, input.teamChemistry) + chemFx.clutchBonus,
    }
    const foulShot = resolveShot(foulShotCtx, rng)

    if (foulShot.made) {
      let points = foulShot.points
      const ftMade = rng.chance(shooter.ratings.freeThrow / 100)
      if (ftMade) points++
      events.push({
        type: 'shot',
        playerId: shooter.id,
        teamId: input.offenseTeamId,
        zone,
        shotType,
        made: true,
        period: input.period,
        timeRemainingSeconds: input.timeRemainingSeconds,
        impact: foulShot.impact,
      })
      events.push({
        type: 'freeThrow',
        playerId: shooter.id,
        teamId: input.offenseTeamId,
        attempt: 1,
        made: ftMade,
        period: input.period,
        timeRemainingSeconds: input.timeRemainingSeconds,
      })
      return {
        points,
        timeElapsedSeconds: clockResult.timeElapsed,
        events,
        possessionChange: true,
        endOfPeriod: false,
        fouled: true,
        shooterId: shooter.id,
        defenderId: defender.id,
        shotZone: zone,
        shotMade: true,
        shotType,
      }
    }

    const ftAttemptCount = isThreePointZone(zone) ? 3 : 2
    let points = 0
    for (let attempt = 1; attempt <= ftAttemptCount; attempt++) {
      const ftPct = shooter.ratings.freeThrow / 100
      const made = rng.chance(ftPct)
      if (made) points++
      events.push({
        type: 'freeThrow',
        playerId: shooter.id,
        teamId: input.offenseTeamId,
        attempt,
        made,
        period: input.period,
        timeRemainingSeconds: input.timeRemainingSeconds,
      })
    }
    return {
      points,
      timeElapsedSeconds: clockResult.timeElapsed,
      events,
      possessionChange: true,
      endOfPeriod: false,
      fouled: true,
      shooterId: shooter.id,
      defenderId: defender.id,
      shotZone: zone,
    }
  }

  const shooterFatigue = input.fatigueEnabled
    ? (input.fatigueByPlayer[shooter.id] ?? 0)
    : 0

  let blocked = false
  let blockDefender: Player | undefined
  if (zone === 'at_rim' || zone === 'short_mid') {
    const blockRating = defender.ratings.block ?? 0
    const blockChance = zone === 'at_rim'
      ? clamp(((blockRating - 40) / 60) * 0.14, 0, 0.14)
      : clamp(((blockRating - 50) / 50) * 0.07, 0, 0.07)
    const driveBonus = (shotType === 'drive' || shotType === 'putback') ? 0.03 : 0
    if (rng.chance(blockChance + driveBonus)) {
      blocked = true
      blockDefender = defender
    }
  } else if (isThreePointZone(zone)) {
    const perimDef = defender.ratings.perimeterDefense ?? 0
    const blockChance = clamp(((perimDef - 60) / 40) * 0.04, 0, 0.04)
    if (rng.chance(blockChance)) {
      blocked = true
      blockDefender = defender
    }
  }

  const shotCtx: ShotContext = {
    shooter,
    defender,
    offenseLineup: input.offense,
    defenseLineup: input.defense,
    zone,
    shotType,
    homeOffense: input.homeOffense,
    inClosingMinutes: input.closingMinutes,
    shooterFatigue,
    lateShot: clockResult.lateShot,
    moraleModifier: moraleConsistencyModifier(shooter.morale),
    clutchModifier: applyClutchAdjustments(
      shooter,
      input.closingMinutes,
      input.teamChemistry,
    ) + chemFx.clutchBonus,
    strategyThreePointBonus: strategyAdj.threePointMakeBonus,
    hotHandModifier: input.shooterStreak ? hotHandModifier(input.shooterStreak) : 0,
    teamStreakModifier: input.teamStreak ? teamStreakMod(input.teamStreak) : 0,
    consistencyVariance: consistencyVarianceFn(shooter.ratings.consistency ?? 50, rng),
    playoffIntensityBonus: 0,
    momentumBonus: input.momentumShotBonus ?? 0,
  }
  const shot: ResolvedShot = resolveShot(shotCtx, rng)
  const shotMade = blocked ? false : shot.made
  const finalPoints: 0 | 2 | 3 = shotMade ? shot.points : 0
  const assister = shotMade ? pickAssister(input.offense, shooter.id, shotType, rng) : undefined
  const blocker = blocked ? blockDefender!.id : undefined

  const shotEvent: SimEvent = {
    type: 'shot',
    playerId: shooter.id,
    teamId: input.offenseTeamId,
    zone,
    shotType,
    made: shotMade,
    period: input.period,
    timeRemainingSeconds: input.timeRemainingSeconds,
    impact: shot.impact,
    ...(assister ? { assistedBy: assister } : {}),
    ...(blocker ? { blockedBy: blocker } : {}),
  }
  events.push(shotEvent)

  if (shotMade) {
    return {
      points: finalPoints,
      timeElapsedSeconds: clockResult.timeElapsed,
      events,
      possessionChange: true,
      endOfPeriod: false,
      shotZone: zone,
      shotMade: true,
      shotType,
      shooterId: shooter.id,
      defenderId: defender.id,
      assisterId: assister,
    }
  }

  const rebound = resolveRebound(
    input.offense,
    input.defense,
    input.offenseTeamId,
    input.defenseTeamId,
    zone,
    rng,
  )
  events.push({
    type: 'rebound',
    playerId: rebound.playerId,
    teamId: rebound.teamId,
    offensive: rebound.offensive,
    period: input.period,
    timeRemainingSeconds: input.timeRemainingSeconds,
    impact: rebound.impact,
  })

  if (rebound.offensive) {
    if (rng.chance(0.35)) {
      const rebounder = input.offense.find(p => p.id === rebound.playerId)
      if (rebounder) {
        const putbackCtx: ShotContext = {
          shooter: rebounder,
          defender,
          offenseLineup: input.offense,
          defenseLineup: input.defense,
          zone: 'at_rim',
          shotType: 'putback',
          homeOffense: input.homeOffense,
          inClosingMinutes: input.closingMinutes,
          shooterFatigue: input.fatigueEnabled ? (input.fatigueByPlayer[rebounder.id] ?? 0) : 0,
          lateShot: false,
          moraleModifier: moraleConsistencyModifier(rebounder.morale),
        }
        const putback = resolveShot(putbackCtx, rng)
        events.push({
          type: 'shot',
          playerId: rebounder.id,
          teamId: input.offenseTeamId,
          zone: 'at_rim',
          shotType: 'putback',
          made: putback.made,
          period: input.period,
          timeRemainingSeconds: input.timeRemainingSeconds,
          impact: putback.impact,
        })
        if (putback.made) {
          return {
            points: putback.points,
            timeElapsedSeconds: 4,
            events,
            possessionChange: true,
            endOfPeriod: false,
            shotZone: 'at_rim',
            shotMade: true,
            shotType: 'putback',
            shooterId: rebounder.id,
            defenderId: defender.id,
            rebounderId: rebound.playerId,
          }
        }
      }
    }
    return {
      points: 0,
      timeElapsedSeconds: 4,
      events,
      possessionChange: false,
      endOfPeriod: false,
      shotZone: zone,
      shotMade: false,
      reboundType: 'offensive',
      shooterId: shooter.id,
      defenderId: defender.id,
      rebounderId: rebound.playerId,
    }
  }

  return {
    points: 0,
    timeElapsedSeconds: clockResult.timeElapsed,
    events,
    possessionChange: true,
    endOfPeriod: false,
    shotZone: zone,
    shotMade: false,
    reboundType: 'defensive',
    shooterId: shooter.id,
    defenderId: defender.id,
    rebounderId: rebound.playerId,
  }
}

export function offenseThreePointRate(
  offense: readonly Player[],
  era: EraConfig,
): number {
  return threePointRateForTeam(offense, era)
}
