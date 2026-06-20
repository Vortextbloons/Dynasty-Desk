import { getEraConfig } from '@/game/models/eraConfig'
import {
  RATING_MAX,
  RATING_REPLACEMENT,
  clampRating,
  type PlayerRatings,
} from '@/game/models/ratings'
import { normalizeStats, type EraNormalizedStats } from './eraAdjustment'
import { blendToMean, ratingScale, sampleWeight } from './ratingScale'
import type { PlayerSeasonStats } from '@/game/models/playerSeasonStats'
import type { Position } from '@/game/models/position'

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
  return 65 + ts * 0.3 + threePct * 0.4 + ft * 0.2
}

function playmakingRating(n: EraNormalizedStats): number {
  return 60 + (n.apg - STARTER_BASELINE.apg) * 4 + n.per * 0.5
}

function reboundingRating(n: EraNormalizedStats): number {
  return 60 + (n.rpg - STARTER_BASELINE.rpg) * 4
}

function defenseRating(n: EraNormalizedStats): number {
  const stock = (n.spg + n.bpg) * 6
  return 60 + stock + n.boxPlusMinus * 1.5
}

function insideScoringRating(
  n: EraNormalizedStats,
  position: Position,
): number {
  const base = 60 + (n.ppg - STARTER_BASELINE.ppg) * 1.8 + n.tsPct * 30
  if (position === 'C' || position === 'PF') return base + 4
  if (position === 'PG' || position === 'SG') return base - 2
  return base
}

function athleticismFromN(n: EraNormalizedStats): number {
  return 60 + (n.usageRate - 18) * 0.4 + n.minutesPerGame * 0.4 + n.per * 0.6
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

  const threePoint = blendToMean(shootingRating(norm), weight, 55)
  const passing = blendToMean(playmakingRating(norm), weight, 55)
  const offensiveRebound = blendToMean(reboundingRating(norm) * 0.7, weight, 45)
  const defensiveRebound = blendToMean(reboundingRating(norm) * 1.1, weight, 60)
  const perimeterDefense = blendToMean(defenseRating(norm), weight, 55)
  const interiorDefense =
    position === 'C' || position === 'PF'
      ? blendToMean(defenseRating(norm) + 5, weight, 60)
      : blendToMean(defenseRating(norm) - 3, weight, 50)
  const insideScoring = blendToMean(
    insideScoringRating(norm, position),
    weight,
    55,
  )
  const freeThrow = blendToMean(60 + (norm.ftPct - 0.78) * 200, weight, 70)
  const midrange = blendToMean(60 + (norm.efgPct - 0.5) * 80, weight, 55)
  const closeShot = blendToMean(60 + (norm.ppg - 10) * 1.2, weight, 60)
  const ballHandling = blendToMean(60 + (norm.usageRate - 18) * 0.6, weight, 55)
  const offensiveIq = blendToMean(
    60 + norm.per * 0.8 + norm.boxPlusMinus * 1.5,
    weight,
    60,
  )
  const steal = blendToMean(60 + norm.spg * 8, weight, 55)
  const block = blendToMean(60 + norm.bpg * 10, weight, 50)
  const defensiveIq = blendToMean(60 + norm.boxPlusMinus * 1.5, weight, 60)
  const speed = blendToMean(
    athleticismFromN(norm) + (position === 'PG' ? 5 : 0),
    weight,
    60,
  )
  const strength =
    position === 'C' || position === 'PF'
      ? blendToMean(athleticismFromN(norm) + 5, weight, 65)
      : blendToMean(athleticismFromN(norm), weight, 55)
  const vertical = blendToMean(60 + (position === 'C' ? 5 : 0), weight, 55)
  const stamina = blendToMean(60 + norm.minutesPerGame * 0.8, weight, 65)
  const durability = blendToMean(60 + totalGames * 0.4, weight, 65)
  const clutch = blendToMean(60 + norm.boxPlusMinus * 0.5, weight, 60)
  const consistency = blendToMean(60 + totalGames * 0.2, weight, 60)
  const potential = Math.min(
    RATING_MAX,
    Math.max(recent.per, insideScoring) + 5,
  )

  return {
    insideScoring: ratingScale(insideScoring),
    closeShot: ratingScale(closeShot),
    midrange: ratingScale(midrange),
    threePoint: ratingScale(threePoint),
    freeThrow: ratingScale(freeThrow),
    ballHandling: ratingScale(ballHandling),
    passing: ratingScale(passing),
    offensiveIq: ratingScale(offensiveIq),
    offensiveRebound: ratingScale(offensiveRebound),
    defensiveRebound: ratingScale(defensiveRebound),
    perimeterDefense: ratingScale(perimeterDefense),
    interiorDefense: ratingScale(interiorDefense),
    steal: ratingScale(steal),
    block: ratingScale(block),
    defensiveIq: ratingScale(defensiveIq),
    speed: ratingScale(speed),
    strength: ratingScale(strength),
    vertical: ratingScale(vertical),
    stamina: ratingScale(stamina),
    durability: ratingScale(durability),
    clutch: ratingScale(clutch),
    consistency: ratingScale(consistency),
    potential: clampRating(potential),
  }
}

function makeDefault(position: Position): PlayerRatings {
  const baseline: PlayerRatings = {
    insideScoring: 50,
    closeShot: 50,
    midrange: 50,
    threePoint: 50,
    freeThrow: 60,
    ballHandling: 50,
    passing: 50,
    offensiveIq: RATING_REPLACEMENT,
    offensiveRebound: 50,
    defensiveRebound: 50,
    perimeterDefense: 50,
    interiorDefense: 50,
    steal: 50,
    block: 50,
    defensiveIq: 50,
    speed: 55,
    strength: 55,
    vertical: 55,
    stamina: 60,
    durability: 65,
    clutch: 50,
    consistency: 55,
    potential: 60,
  }
  if (position === 'C') {
    baseline.interiorDefense = 60
    baseline.insideScoring = 55
    baseline.vertical = 60
  } else if (position === 'PG') {
    baseline.ballHandling = 60
    baseline.passing = 60
    baseline.speed = 65
  }
  return baseline
}
