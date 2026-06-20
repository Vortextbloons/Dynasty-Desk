import type { PlayerRatings } from '@/game/models/ratings'
import type { Position } from '@/game/models/position'

type RatingKey = keyof PlayerRatings

export const OVERALL_WEIGHTS: Record<Position, Partial<Record<RatingKey, number>>> = {
  PG: {
    ballHandling: 0.15,
    passing: 0.15,
    perimeterDefense: 0.12,
    threePoint: 0.12,
    speed: 0.10,
    offensiveIq: 0.10,
    midrange: 0.06,
    freeThrow: 0.05,
    consistency: 0.05,
    defensiveIq: 0.05,
    steal: 0.05,
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
  return Math.round(sum)
}
