export interface LineupRatingWeights {
  spacing: number
  shotCreation: number
  passing: number
  rimPressure: number
  perimeterDefense: number
  interiorDefense: number
  rebounding: number
  transition: number
  benchBalance: number
  size: number
  switchability: number
}

export const DEFAULT_LINEUP_WEIGHTS: LineupRatingWeights = {
  spacing: 0.12,
  shotCreation: 0.12,
  passing: 0.08,
  rimPressure: 0.10,
  perimeterDefense: 0.12,
  interiorDefense: 0.10,
  rebounding: 0.10,
  transition: 0.08,
  benchBalance: 0.05,
  size: 0.05,
  switchability: 0.08,
}

export function computeWeightedOverall(
  dimensions: Record<keyof LineupRatingWeights, number>,
  weights: LineupRatingWeights = DEFAULT_LINEUP_WEIGHTS,
): number {
  let sum = 0
  let weightSum = 0
  for (const [key, weight] of Object.entries(weights) as [string, number][]) {
    const val = dimensions[key as keyof LineupRatingWeights]
    if (val !== undefined) {
      sum += val * weight
      weightSum += weight
    }
  }
  if (weightSum === 0) return 0
  return Math.round((sum / weightSum) * 100) / 100
}
