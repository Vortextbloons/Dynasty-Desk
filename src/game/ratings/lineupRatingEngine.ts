import type { Player } from '@/game/models/player'
import type { LineupRating } from '@/game/models/team'
import {
  DEFAULT_LINEUP_WEIGHTS,
  computeWeightedOverall,
  type LineupRatingWeights,
} from './lineupRatingWeights'

function avg(...values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)))
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = avg(...values)
  const squareDiffs = values.map((v) => (v - mean) ** 2)
  return Math.sqrt(avg(...squareDiffs))
}

function tendency(p: Player, key: string): number {
  return ((p.tendencies as unknown as Record<string, number>)[key]) ?? 0
}

function computeSpacing(players: Player[]): number {
  if (players.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const p of players) {
    const shootWeight =
      tendency(p, 'cornerThreeFrequency') +
      tendency(p, 'aboveBreakThreeFrequency')
    const weight = 1 + shootWeight / 100
    weightedSum += p.ratings.threePoint * weight
    totalWeight += weight
  }
  return clamp(totalWeight > 0 ? weightedSum / totalWeight : 50)
}

function computeShotCreation(players: Player[]): number {
  if (players.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const p of players) {
    const base = avg(p.ratings.ballHandling, p.ratings.passing, p.ratings.offensiveIq)
    const createWeight =
      tendency(p, 'isolationRate') + tendency(p, 'pickAndRollBallHandlerRate')
    const weight = 1 + createWeight / 100
    weightedSum += base * weight
    totalWeight += weight
  }
  return clamp(totalWeight > 0 ? weightedSum / totalWeight : 50)
}

function computePassing(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce((s, p) => s + avg(p.ratings.passing, p.ratings.offensiveIq), 0)
  return clamp(sum / players.length)
}

function computeRimPressure(players: Player[]): number {
  if (players.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const p of players) {
    const base = avg(p.ratings.insideScoring, p.ratings.closeShot)
    const weight = 1 + (tendency(p, 'rimFrequency') + tendency(p, 'driveRate')) / 100
    weightedSum += base * weight
    totalWeight += weight
  }
  return clamp(totalWeight > 0 ? weightedSum / totalWeight : 50)
}

function computePerimeterDefense(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce(
    (s, p) => s + avg(p.ratings.perimeterDefense, p.ratings.steal),
    0,
  )
  return clamp(sum / players.length)
}

function computeInteriorDefense(players: Player[]): number {
  if (players.length === 0) return 0
  const sum = players.reduce(
    (s, p) => s + avg(p.ratings.interiorDefense, p.ratings.block),
    0,
  )
  return clamp(sum / players.length)
}

function computeRebounding(players: Player[]): number {
  if (players.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const p of players) {
    const base = avg(p.ratings.offensiveRebound, p.ratings.defensiveRebound)
    const sizeWeight = p.heightInches * 0.6 + p.weightLbs * 0.4
    const weight = sizeWeight / 100
    weightedSum += base * weight
    totalWeight += weight
  }
  return clamp(totalWeight > 0 ? weightedSum / totalWeight : 50)
}

function computeTransition(players: Player[]): number {
  if (players.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const p of players) {
    const base = avg(p.ratings.speed, p.ratings.vertical)
    const weight = 1 + tendency(p, 'transitionRate') / 100
    weightedSum += base * weight
    totalWeight += weight
  }
  return clamp(totalWeight > 0 ? weightedSum / totalWeight : 50)
}

function computeBenchBalance(targetMinutes: Record<string, number>): number {
  const values = Object.values(targetMinutes)
  if (values.length === 0) return 50
  const sd = stdDev(values)
  const maxStdDev = 15
  return clamp(100 - (sd / maxStdDev) * 100)
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
  return clamp(((avgSize - minSize) / (maxSize - minSize)) * 100)
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
  return clamp(base - sizeMismatch)
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
