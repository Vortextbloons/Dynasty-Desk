export function blendToMean(
  value: number,
  sampleWeight: number,
  mean: number,
): number {
  const w = Math.max(0, Math.min(1, sampleWeight))
  return value * w + mean * (1 - w)
}

export function sampleWeight(minutes: number, games: number): number {
  const minutesWeight = Math.min(1, minutes / 1500)
  const gamesWeight = Math.min(1, games / 45)
  return 0.6 * minutesWeight + 0.4 * gamesWeight
}
