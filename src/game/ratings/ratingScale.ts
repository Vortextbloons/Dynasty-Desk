export function ratingScale(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.max(0, Math.min(100, value))
}

export function blendToMean(
  value: number,
  sampleWeight: number,
  mean: number,
): number {
  const w = Math.max(0, Math.min(1, sampleWeight))
  return value * w + mean * (1 - w)
}

export function sampleWeight(minutes: number, games: number): number {
  const minutesWeight = Math.min(1, minutes / 2000)
  const gamesWeight = Math.min(1, games / 60)
  return 0.6 * minutesWeight + 0.4 * gamesWeight
}
