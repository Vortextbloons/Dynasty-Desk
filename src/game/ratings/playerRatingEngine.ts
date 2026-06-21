import { getEraConfig } from '@/game/models/eraConfig'
import {
  RATING_MAX,
  RATING_REPLACEMENT,
  clampRating,
  type PlayerRatings,
} from '@/game/models/ratings'
import { normalizeStats, type EraNormalizedStats } from './eraAdjustment'
import { blendToMean, sampleWeight } from './ratingScale'
import { clamp } from '@/lib/utils'
import { computeOverall } from './overallWeights'
import type { PlayerSeasonStats } from '@/game/models/playerSeasonStats'
import type { Position } from '@/game/models/position'

function scaleRating(value: number): number {
  if (!Number.isFinite(value)) return RATING_REPLACEMENT
  return clamp(value, 0, 100)
}

const STARTER_BASELINE: EraNormalizedStats = {
  ppg: 14,
  rpg: 4,
  apg: 3,
  spg: 1.1,
  bpg: 0.6,
  topg: 1.7,
  tsPct: 0.56,
  efgPct: 0.52,
  threePARate: 0.32,
  threePct: 0.35,
  ftPct: 0.78,
  usageRate: 21,
  minutesPerGame: 30,
  per: 16,
  winShares: 5,
  boxPlusMinus: 2,
  vorp: 2.5,
}

function shootingRating(n: EraNormalizedStats): number {
  const ts = (n.tsPct - 0.5) * 200
  const threePct = (n.threePct - 0.3) * 200
  const ft = (n.ftPct - 0.7) * 100
  return 62 + ts * 0.35 + threePct * 0.45 + ft * 0.25
}

function playmakingRating(n: EraNormalizedStats): number {
  return 60 + (n.apg - STARTER_BASELINE.apg) * 5 + n.per * 0.6
}

function reboundingRating(n: EraNormalizedStats): number {
  return 60 + (n.rpg - STARTER_BASELINE.rpg) * 5
}

function defenseRating(n: EraNormalizedStats): number {
  const stock = (n.spg + n.bpg) * 7
  return 60 + stock + n.boxPlusMinus * 1.8
}

function insideScoringRating(
  n: EraNormalizedStats,
  position: Position,
): number {
  const base = 60 + (n.ppg - STARTER_BASELINE.ppg) * 2.2 + n.tsPct * 35
  if (position === 'C' || position === 'PF') return base + 4
  if (position === 'PG' || position === 'SG') return base - 2
  return base
}

function athleticismFromN(n: EraNormalizedStats): number {
  return 60 + (n.usageRate - 18) * 0.5 + n.minutesPerGame * 0.5 + n.per * 0.7
}

export function generateRatings(
  stats: PlayerSeasonStats[],
  position: Position,
  season: string,
): PlayerRatings {
  const era = getEraConfig(season)
  const totalGames = stats.reduce((acc, s) => acc + s.gamesPlayed, 0)
  const totalMinutes = stats.reduce((acc, s) => acc + s.minutes, 0)

  if (totalGames === 0 || totalMinutes === 0) {
    return makeDefault(position)
  }

  const recent = stats[stats.length - 1]
  if (!recent) return makeDefault(position)

  const norm = normalizeStats(recent, era)
  const weight = sampleWeight(totalMinutes, totalGames)

  const threePoint = blendToMean(shootingRating(norm), weight, 54)
  const passing = blendToMean(playmakingRating(norm), weight, 54)
  const offensiveRebound = blendToMean(reboundingRating(norm) * 0.7, weight, 45)
  const defensiveRebound = blendToMean(reboundingRating(norm) * 1.1, weight, 59)
  const perimeterDefense = blendToMean(defenseRating(norm), weight, 54)
  const interiorDefense =
    position === 'C' || position === 'PF'
      ? blendToMean(defenseRating(norm) + 5, weight, 59)
      : blendToMean(defenseRating(norm) - 3, weight, 49)
  const insideScoring = blendToMean(
    insideScoringRating(norm, position),
    weight,
    54,
  )
  const freeThrow = blendToMean(60 + (norm.ftPct - 0.78) * 200, weight, 69)
  const midrange = blendToMean(60 + (norm.efgPct - 0.5) * 80, weight, 54)
  const closeShot = blendToMean(60 + (norm.ppg - 10) * 1.2, weight, 59)
  const ballHandling = blendToMean(60 + (norm.usageRate - 18) * 0.6, weight, 54)
  const offensiveIq = blendToMean(
    60 + norm.per * 0.8 + norm.boxPlusMinus * 1.5,
    weight,
    59,
  )
  const steal = blendToMean(60 + norm.spg * 8, weight, 54)
  const block = blendToMean(60 + norm.bpg * 10, weight, 49)
  const defensiveIq = blendToMean(60 + norm.boxPlusMinus * 1.5, weight, 59)
  const speed = blendToMean(
    athleticismFromN(norm) + (position === 'PG' ? 5 : 0),
    weight,
    59,
  )
  const strength =
    position === 'C' || position === 'PF'
      ? blendToMean(athleticismFromN(norm) + 5, weight, 64)
      : blendToMean(athleticismFromN(norm), weight, 54)
  const vertical = blendToMean(60 + (position === 'C' ? 5 : 0), weight, 54)
  const stamina = blendToMean(60 + norm.minutesPerGame * 0.8, weight, 64)
  const durability = blendToMean(60 + totalGames * 0.4, weight, 64)
  const clutch = blendToMean(60 + norm.boxPlusMinus * 0.5, weight, 59)
  const consistency = blendToMean(60 + totalGames * 0.2, weight, 59)
  const potential = Math.min(
    RATING_MAX,
    Math.max(recent.per, insideScoring) + 5,
  )

  const ratings: Omit<PlayerRatings, 'overall'> = {
    insideScoring: scaleRating(insideScoring),
    closeShot: scaleRating(closeShot),
    midrange: scaleRating(midrange),
    threePoint: scaleRating(threePoint),
    freeThrow: scaleRating(freeThrow),
    ballHandling: scaleRating(ballHandling),
    passing: scaleRating(passing),
    offensiveIq: scaleRating(offensiveIq),
    offensiveRebound: scaleRating(offensiveRebound),
    defensiveRebound: scaleRating(defensiveRebound),
    perimeterDefense: scaleRating(perimeterDefense),
    interiorDefense: scaleRating(interiorDefense),
    steal: scaleRating(steal),
    block: scaleRating(block),
    defensiveIq: scaleRating(defensiveIq),
    speed: scaleRating(speed),
    strength: scaleRating(strength),
    vertical: scaleRating(vertical),
    stamina: scaleRating(stamina),
    durability: scaleRating(durability),
    clutch: scaleRating(clutch),
    consistency: scaleRating(consistency),
    potential: clampRating(potential),
  }

  return { ...ratings, overall: computeOverall(ratings as PlayerRatings, position) }
}

function makeDefault(position: Position): PlayerRatings {
  const baseline: Omit<PlayerRatings, 'overall'> = {
    insideScoring: 50,
    closeShot: 50,
    midrange: 50,
    threePoint: 50,
    freeThrow: 60,
    ballHandling: 50,
    passing: 50,
    offensiveIq: 50,
    offensiveRebound: 50,
    defensiveRebound: 50,
    perimeterDefense: 50,
    interiorDefense: 50,
    steal: 50,
    block: 50,
    defensiveIq: 50,
    speed: 54,
    strength: 54,
    vertical: 54,
    stamina: 60,
    durability: 64,
    clutch: 50,
    consistency: 54,
    potential: 60,
  }
  if (position === 'C') {
    baseline.interiorDefense = 60
    baseline.insideScoring = 54
    baseline.vertical = 60
  } else if (position === 'PG') {
    baseline.ballHandling = 60
    baseline.passing = 60
    baseline.speed = 64
  }
  return { ...baseline, overall: computeOverall(baseline as PlayerRatings, position) }
}
