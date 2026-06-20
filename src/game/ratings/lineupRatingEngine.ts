import type { Player } from '@/game/models/player'
import type { LineupRating } from '@/game/models/team'
import type { PlayerTendencies } from '@/game/models/tendencies'
import { clamp } from '@/lib/utils'
import {
  DEFAULT_LINEUP_WEIGHTS,
  computeWeightedOverall,
  type LineupRatingWeights,
} from './lineupRatingWeights'

function avg(...values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function ratingClamp(val: number, min = 0, max = 100): number {
  return Math.round(clamp(val, min, max))
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = avg(...values)
  const squareDiffs = values.map((v) => (v - mean) ** 2)
  return Math.sqrt(avg(...squareDiffs))
}

function tendency(p: Player, key: keyof PlayerTendencies): number {
  return p.tendencies[key]
}

function weightedAverage(
  players: Player[],
  baseFn: (p: Player) => number,
  weightFn: (p: Player) => number,
  defaultValue = 50,
): number {
  if (players.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const p of players) {
    const weight = weightFn(p)
    weightedSum += baseFn(p) * weight
    totalWeight += weight
  }
  return ratingClamp(totalWeight > 0 ? weightedSum / totalWeight : defaultValue)
}

function computeSpacing(players: Player[]): number {
  return weightedAverage(
    players,
    (p) => p.ratings.threePoint,
    (p) =>
      1 +
      (tendency(p, 'cornerThreeFrequency') + tendency(p, 'aboveBreakThreeFrequency')) /
        100,
  )
}

function computeShotCreation(players: Player[]): number {
  return weightedAverage(
    players,
    (p) => avg(p.ratings.ballHandling, p.ratings.passing, p.ratings.offensiveIq),
    (p) =>
      1 +
      (tendency(p, 'isolationRate') + tendency(p, 'pickAndRollBallHandlerRate')) / 100,
  )
}

function computePassing(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce((s, p) => s + avg(p.ratings.passing, p.ratings.offensiveIq), 0)
  return ratingClamp(sum / players.length)
}

function computeRimPressure(players: Player[]): number {
  return weightedAverage(
    players,
    (p) => avg(p.ratings.insideScoring, p.ratings.closeShot),
    (p) => 1 + (tendency(p, 'rimFrequency') + tendency(p, 'driveRate')) / 100,
  )
}

function computePerimeterDefense(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce(
    (s, p) => s + avg(p.ratings.perimeterDefense, p.ratings.steal),
    0,
  )
  return ratingClamp(sum / players.length)
}

function computeInteriorDefense(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce(
    (s, p) => s + avg(p.ratings.interiorDefense, p.ratings.block),
    0,
  )
  return ratingClamp(sum / players.length)
}

function computeRebounding(players: Player[]): number {
  return weightedAverage(
    players,
    (p) => avg(p.ratings.offensiveRebound, p.ratings.defensiveRebound),
    (p) => (p.heightInches * 0.6 + p.weightLbs * 0.4) / 100,
  )
}

function computeTransition(players: Player[]): number {
  return weightedAverage(
    players,
    (p) => avg(p.ratings.speed, p.ratings.vertical),
    (p) => 1 + tendency(p, 'transitionRate') / 100,
  )
}

function computeBenchBalance(targetMinutes: Record<string, number>): number {
  const values = Object.values(targetMinutes)
  if (values.length === 0) return 50
  const sd = stdDev(values)
  const maxStdDev = 15
  return ratingClamp(100 - (sd / maxStdDev) * 100)
}

function computeSize(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce(
    (s, p) => s + (p.heightInches * 0.6 + p.weightLbs * 0.4),
    0,
  )
  const avgSize = sum / players.length
  const minSize = 60 * 0.6 + 150 * 0.4
  const maxSize = 84 * 0.6 + 280 * 0.4
  return ratingClamp(((avgSize - minSize) / (maxSize - minSize)) * 100)
}

function computeSwitchability(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce(
    (s, p) =>
      s +
      avg(
        p.ratings.speed,
        p.ratings.defensiveIq,
        p.ratings.perimeterDefense,
        p.ratings.interiorDefense,
      ),
    0,
  )
  const base = sum / players.length
  const avgHeight = players.reduce((s, p) => s + p.heightInches, 0) / players.length
  const sizeMismatch = Math.max(0, (avgHeight - 78) * 1.5)
  return ratingClamp(base - sizeMismatch)
}

export function rateLineup(
  players: Player[],
  targetMinutes: Record<string, number> = {},
  weights: LineupRatingWeights = DEFAULT_LINEUP_WEIGHTS,
): LineupRating {
  const dimensions = {
    spacing: computeSpacing(players),
    shotCreation: computeShotCreation(players),
    passing: computePassing(players),
    rimPressure: computeRimPressure(players),
    perimeterDefense: computePerimeterDefense(players),
    interiorDefense: computeInteriorDefense(players),
    rebounding: computeRebounding(players),
    transition: computeTransition(players),
    benchBalance: computeBenchBalance(targetMinutes),
    size: computeSize(players),
    switchability: computeSwitchability(players),
  }

  const overall = computeWeightedOverall(dimensions, weights)

  return {
    ...dimensions,
    overall,
  }
}
