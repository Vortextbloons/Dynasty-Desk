import type { PlayerRatings } from '@/game/models/ratings'
import { clampRating } from '@/game/models/ratings'
import type { Position } from '@/game/models/position'
import type { PlayerSeasonStats } from '@/game/models/playerSeasonStats'
import { clamp } from '@/lib/utils'

type RatingKey = keyof PlayerRatings

export const OVERALL_WEIGHTS: Record<Position, Partial<Record<RatingKey, number>>> = {
  PG: {
    ballHandling: 0.13,
    passing: 0.13,
    perimeterDefense: 0.12,
    threePoint: 0.12,
    speed: 0.10,
    offensiveIq: 0.10,
    midrange: 0.04,
    freeThrow: 0.05,
    consistency: 0.05,
    defensiveIq: 0.03,
    steal: 0.03,
    closeShot: 0.05,
    insideScoring: 0.05,
  },
  SG: {
    threePoint: 0.15,
    perimeterDefense: 0.12,
    midrange: 0.10,
    ballHandling: 0.10,
    speed: 0.08,
    offensiveIq: 0.08,
    steal: 0.07,
    freeThrow: 0.06,
    consistency: 0.05,
    defensiveIq: 0.05,
    insideScoring: 0.05,
    closeShot: 0.05,
    offensiveRebound: 0.04,
  },
  SF: {
    threePoint: 0.12,
    midrange: 0.10,
    perimeterDefense: 0.12,
    defensiveIq: 0.08,
    offensiveIq: 0.08,
    speed: 0.07,
    ballHandling: 0.06,
    insideScoring: 0.06,
    offensiveRebound: 0.05,
    defensiveRebound: 0.05,
    freeThrow: 0.05,
    consistency: 0.05,
    strength: 0.05,
    steal: 0.06,
  },
  PF: {
    insideScoring: 0.15,
    defensiveRebound: 0.12,
    offensiveRebound: 0.08,
    interiorDefense: 0.10,
    midrange: 0.08,
    threePoint: 0.07,
    strength: 0.08,
    offensiveIq: 0.06,
    defensiveIq: 0.06,
    freeThrow: 0.04,
    consistency: 0.05,
    closeShot: 0.06,
    vertical: 0.05,
  },
  C: {
    insideScoring: 0.18,
    defensiveRebound: 0.15,
    interiorDefense: 0.12,
    offensiveRebound: 0.08,
    strength: 0.10,
    closeShot: 0.07,
    offensiveIq: 0.06,
    defensiveIq: 0.05,
    freeThrow: 0.04,
    consistency: 0.05,
    vertical: 0.05,
    block: 0.05,
  },
}

export function getPositionWeights(position: Position): Partial<Record<RatingKey, number>> {
  return OVERALL_WEIGHTS[position]
}

export function computeOverall(ratings: PlayerRatings, position: Position): number {
  const weights = OVERALL_WEIGHTS[position]
  let sum = 0
  for (const [key, weight] of Object.entries(weights)) {
    const value = ratings[key as RatingKey]
    if (typeof value === 'number' && typeof weight === 'number') {
      sum += value * weight
    }
  }
  if (sum <= 50) return Math.round(sum)
  const deviation = sum - 50
  return Math.min(99, Math.round(50 + deviation * (1 + deviation / 55)))
}

export function computeProductionImpact(stats: PlayerSeasonStats): number {
  const gp = Math.max(1, stats.gamesPlayed)
  const minutes = stats.minutes
  if (gp === 0 || minutes === 0) return 0

  const ppg = stats.points / gp
  const rpg = stats.rebounds / gp
  const apg = stats.assists / gp
  const mpg = minutes / gp
  const per = stats.per
  const bpm = stats.boxPlusMinus
  const usage = stats.usageRate
  const tsPct = stats.tsPct

  let impact =
    62 +
    (ppg - 10) * 1.0 +
    (rpg - 4) * 0.7 +
    (apg - 3) * 0.95 +
    (per - 15) * 0.9 +
    bpm * 1.5 +
    (usage - 20) * 0.35 +
    (mpg - 24) * 0.35 +
    (tsPct - 0.57) * 50

  if (ppg >= 24 && tsPct >= 0.59) {
    impact += 3.5
  } else if (ppg >= 24 && tsPct >= 0.56) {
    impact += 2
  }
  if (apg >= 6 && usage >= 26) {
    impact += 2
  }
  if (ppg >= 20 && per >= 20) {
    impact += 1.5
  }

  return clamp(impact, 55, 99)
}

export function computeRealOverall(
  ratings: PlayerRatings,
  position: Position,
  stats: PlayerSeasonStats,
): number {
  const skillOverall = computeOverall(ratings, position)
  const productionImpact = computeProductionImpact(stats)
  if (productionImpact === 0) return skillOverall

  const gp = Math.max(1, stats.gamesPlayed)
  const ppg = stats.points / gp
  const mpg = stats.minutes / gp

  const blended = Math.max(skillOverall, skillOverall * 0.65 + productionImpact * 0.35)

  let floor = 0
  if (mpg >= 28 && gp >= 40) {
    if (ppg >= 26) floor = 88
    else if (ppg >= 22) floor = 84
    else if (ppg >= 16) floor = 80
    else if (ppg >= 12) floor = 76
  } else if (mpg >= 24 && gp >= 35) {
    if (ppg >= 18) floor = 78
    else if (ppg >= 14) floor = 74
    else if (ppg >= 10) floor = 70
  } else if (mpg >= 18 && gp >= 40) {
    if (ppg >= 14) floor = 72
    else if (ppg >= 10) floor = 68
    else if (ppg >= 6) floor = 64
  } else if (gp >= 50) {
    floor = 66
  } else if (gp >= 30) {
    floor = 62
  }

  let boosted = Math.max(blended, floor)

  let finalBoost: number
  if (boosted < 65) finalBoost = 5.0
  else if (boosted < 72) finalBoost = 5.0
  else if (boosted < 78) finalBoost = 4.0
  else if (boosted < 85) finalBoost = 3.0
  else finalBoost = 2.0

  return clampRating(boosted + finalBoost)
}
