import type { Player } from '@/game/models/player'
import type { ShotZone, ShotType, PossessionResult, SimEvent } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import { resolveShot, selectZone, type ShotContext } from '@/game/sim/shotModel'
import { turnoverChance, resolveTurnover } from '@/game/sim/turnoverModel'
import { resolveRebound } from '@/game/sim/reboundModel'
import { shootingFoulChance, resolveFoul } from '@/game/sim/foulModel'
import {
  isThreePointZone,
  threePointRateForTeam,
} from '@/game/sim/shotZones'
import type { EraConfig } from '@/game/models/eraConfig'

export interface PossessionInput {
  offense: Player[]
  defense: Player[]
  offenseTeamId: string
  defenseTeamId: string
  homeOffense: boolean
  closingMinutes: boolean
  fatigueActive: boolean
  era: EraConfig
  threePointRate: number
  possessionType: 'half_court' | 'transition'
  period: number
  timeRemainingSeconds: number
  baseTimeSeconds: number
}

const AVERAGE_POSSESSION_SECONDS = 15
const TRANSITION_POSSESSION_SECONDS = 9
const TRANSITION_PROBABILITY = 0.18

export function selectPossessionType(rng: SeededRandom): 'half_court' | 'transition' {
  return rng.chance(TRANSITION_PROBABILITY) ? 'transition' : 'half_court'
}

export function selectPrimaryPlayer(
  offense: readonly Player[],
  minutesPlayed: Record<string, number>,
  rng: SeededRandom,
): Player {
  if (offense.length === 0) {
    throw new Error('selectPrimaryPlayer: empty offense')
  }
  const weights = offense.map((p) => {
    const usage = Math.max(2, p.tendencies.usageRate)
    const minutes = Math.max(1, (minutesPlayed[p.id] ?? 1))
    return usage * Math.sqrt(minutes)
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
  if (shotType !== 'catch_and_shoot' && shotType !== 'transition') return undefined
  const passers = offense.filter((p) => p.id !== shooterId && p.ratings.passing >= 60)
  if (passers.length === 0) return undefined
  const weights = passers.map((p) => Math.max(1, p.ratings.passing))
  return rng.weightedPick(passers, weights).id
}

function pickBlocker(
  defense: readonly Player[],
  zone: ShotZone,
  rng: SeededRandom,
): string | undefined {
  if (zone !== 'at_rim' && !isThreePointZone(zone)) return undefined
  const candidates = defense.filter((d) => {
    if (zone === 'at_rim') return d.ratings.block >= 50
    return d.ratings.perimeterDefense >= 65
  })
  if (candidates.length === 0) return undefined
  if (!rng.chance(0.05)) return undefined
  const weights = candidates.map((d) => Math.max(1, d.ratings.block))
  return rng.weightedPick(candidates, weights).id
}

export function resolvePossession(
  input: PossessionInput,
  rng: SeededRandom,
): PossessionResult {
  const events: SimEvent[] = []

  const primary = selectPrimaryPlayer(input.offense, {}, rng)
  const defender = selectDefender(primary, input.defense, rng)
  const shotType = selectShotType(input.possessionType, primary, rng)
  const zone = selectZone(primary, input.threePointRate, input.possessionType === 'transition', rng)

  const toChance = turnoverChance(primary, input.defense)
  const foulChance = shootingFoulChance(primary, defender, zone)

  if (rng.chance(toChance)) {
    const t = resolveTurnover(primary, input.defense, rng)
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
      timeElapsedSeconds: input.possessionType === 'transition'
        ? TRANSITION_POSSESSION_SECONDS
        : AVERAGE_POSSESSION_SECONDS,
      events,
      possessionChange: true,
      endOfPeriod: false,
      turnoverType: t.turnoverType,
      shooterId: t.playerId,
      stealerId: t.stolenBy,
    }
  }

  if (rng.chance(foulChance)) {
    const foul = resolveFoul(defender, primary, true, rng)
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
    const ftAttemptCount = isThreePointZone(zone) ? 3 : 2
    let points = 0
    for (let attempt = 1; attempt <= ftAttemptCount; attempt++) {
      const ftPct = primary.ratings.freeThrow / 100
      const made = rng.chance(ftPct)
      if (made) points++
      events.push({
        type: 'freeThrow',
        playerId: primary.id,
        teamId: input.offenseTeamId,
        attempt,
        made,
        period: input.period,
        timeRemainingSeconds: input.timeRemainingSeconds,
      })
    }
    return {
      points,
      timeElapsedSeconds: AVERAGE_POSSESSION_SECONDS,
      events,
      possessionChange: true,
      endOfPeriod: false,
      fouled: true,
      shooterId: primary.id,
      defenderId: defender.id,
      shotZone: zone,
    }
  }

  const shotCtx: ShotContext = {
    shooter: primary,
    defender,
    offenseLineup: input.offense,
    defenseLineup: input.defense,
    zone,
    shotType,
    homeOffense: input.homeOffense,
    inClosingMinutes: input.closingMinutes,
    shooterFatigue: input.fatigueActive,
  }
  const shot = resolveShot(shotCtx, rng)
  const assister = shot.made ? pickAssister(input.offense, primary.id, shotType, rng) : undefined
  const blocker = !shot.made ? pickBlocker(input.defense, zone, rng) : undefined

  const shotEvent: SimEvent = {
    type: 'shot',
    playerId: primary.id,
    teamId: input.offenseTeamId,
    zone,
    shotType,
    made: shot.made,
    period: input.period,
    timeRemainingSeconds: input.timeRemainingSeconds,
    impact: shot.impact,
    ...(assister ? { assistedBy: assister } : {}),
    ...(blocker ? { blockedBy: blocker } : {}),
  }
  events.push(shotEvent)

  if (shot.made) {
    return {
      points: shot.points,
      timeElapsedSeconds: input.possessionType === 'transition'
        ? TRANSITION_POSSESSION_SECONDS
        : AVERAGE_POSSESSION_SECONDS,
      events,
      possessionChange: true,
      endOfPeriod: false,
      shotZone: zone,
      shotMade: true,
      shotType,
      shooterId: primary.id,
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
    return {
      points: 0,
      timeElapsedSeconds: 6,
      events,
      possessionChange: false,
      endOfPeriod: false,
      shotZone: zone,
      shotMade: false,
      reboundType: 'offensive',
      shooterId: primary.id,
      defenderId: defender.id,
      rebounderId: rebound.playerId,
    }
  }

  return {
    points: 0,
    timeElapsedSeconds: input.possessionType === 'transition'
      ? TRANSITION_POSSESSION_SECONDS
      : AVERAGE_POSSESSION_SECONDS,
    events,
    possessionChange: true,
    endOfPeriod: false,
    shotZone: zone,
    shotMade: false,
    reboundType: 'defensive',
    shooterId: primary.id,
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
