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
  const isBigProfile =
    position === 'C' ||
    ((position === 'PF' || position === 'SF') &&
      ratings.interiorDefense >= 70 &&
      ratings.defensiveRebound >= 75 &&
      ratings.block >= 65)
  const curveDivisor = isBigProfile ? 120 : 85
  return Math.min(100, Math.round(50 + deviation * (1 + deviation / curveDivisor)))
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
  const rpg = stats.rebounds / gp
  const apg = stats.assists / gp
  const mpg = stats.minutes / gp
  const usage = stats.usageRate
  const bpm = stats.boxPlusMinus

  const blended = Math.max(skillOverall, skillOverall * 0.65 + productionImpact * 0.35)

  let floor = 0
  if (mpg >= 28 && gp >= 40) {
    if (ppg >= 26) floor = 88
    else if (ppg >= 22) floor = 84
    else if (ppg >= 16) floor = 80
    else if (ppg >= 12) floor = 76
  } else if (mpg >= 24 && gp >= 35) {
    if (ppg >= 18) floor = 79
    else if (ppg >= 14) floor = 75
    else if (ppg >= 10) floor = 71
  } else if (mpg >= 18 && gp >= 40) {
    if (ppg >= 14) floor = 73
    else if (ppg >= 10) floor = 69
    else if (ppg >= 6) floor = 65
  } else if (mpg >= 18 && gp >= 15) {
    if (ppg >= 7) floor = 70
    else floor = 68
  } else if (mpg >= 12 && gp >= 15) {
    floor = 69
  } else if (mpg >= 8 && gp >= 15) {
    floor = 69
  } else if (gp >= 50) {
    floor = 67
  } else if (gp >= 30) {
    floor = 63
  }
  if (gp >= 15 && mpg >= 28 && ppg >= 22 && usage >= 28) {
    floor = Math.max(floor, 89)
  }
  if (gp >= 15 && mpg >= 28 && ppg >= 24 && bpm >= 4) {
    floor = Math.max(floor, 92)
  }
  if (gp >= 40 && mpg >= 28 && ppg >= 23) {
    floor = Math.max(floor, 90)
  }
  if (gp >= 30 && mpg >= 28 && ppg >= 17 && apg >= 5) {
    floor = Math.max(floor, 81)
  }
  if (gp >= 40 && mpg >= 30 && ppg >= 22) {
    floor = Math.max(floor, 85)
  }
  if (gp >= 30 && mpg >= 20 && ppg >= 8) {
    floor = Math.max(floor, 73)
  }
  if (gp >= 20 && mpg >= 25 && ppg >= 20 && usage >= 25) {
    floor = Math.max(floor, 84)
  }
  if (gp >= 30 && mpg >= 24 && ppg >= 14 && rpg >= 7 && bpm >= 2.5) {
    floor = Math.max(floor, 80)
  }
  if (gp >= 35 && mpg >= 24 && apg >= 6) {
    floor = Math.max(floor, 75)
  }
  if (gp >= 10) {
    floor = Math.max(floor, 67)
  }

  let boosted = Math.max(blended, floor)

  const isBigProfile =
    position === 'C' ||
    ((position === 'PF' || position === 'SF') &&
      ratings.interiorDefense >= 70 &&
      ratings.defensiveRebound >= 75 &&
      ratings.block >= 65)

  if (isBigProfile && usage < 28) {
    if (ppg < 12) boosted = Math.min(boosted, 82)
    else if (ppg < 17) boosted = Math.min(boosted, bpm >= 3 ? 88 : 83)
    else if (ppg < 20) boosted = Math.min(boosted, bpm >= 3 ? 88 : 82)
    else if (ppg < 25 && bpm < 3) boosted = Math.min(boosted, 91)
    else if (ppg < 25) boosted = Math.min(boosted, 94)
  }
  if (isBigProfile && usage >= 28 && ppg < 25) {
    boosted = Math.min(boosted, 89)
  }
  if (!isBigProfile && usage >= 28 && bpm < 3) {
    const cap = bpm < 0 ? 82 : gp < 30 && ppg >= 22 ? 89 : ppg >= 24 && stats.tsPct >= 0.58 ? 88 : 87
    boosted = Math.min(boosted, cap)
  }
  if (!isBigProfile && ppg >= 18 && ppg < 23 && usage >= 24 && bpm < 1.5) {
    boosted = Math.min(boosted, ppg >= 22 ? 83 : 82)
  }
  if (!isBigProfile && ppg >= 20 && usage < 28 && bpm < 2.5) {
    boosted = Math.min(boosted, 87)
  }
  if (!isBigProfile && ppg >= 20 && ppg < 25 && usage < 28) {
    boosted = Math.min(boosted, 89)
  }
  if (!isBigProfile && ppg >= 20 && usage < 26 && bpm < 1.5) {
    boosted = Math.min(boosted, 82)
  }

  let finalBoost: number
  if (boosted < 65) finalBoost = 6.0
  else if (boosted < 72) finalBoost = 6.0
  else if (boosted < 78) finalBoost = 6.0
  else if (boosted < 85) finalBoost = 4.0
  else finalBoost = 2.0

  return clampRating(boosted + finalBoost)
}
