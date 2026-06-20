import type { Player } from '@/game/models/player'
import { clamp } from '@/lib/utils'

export type FatigueStat = 'shooting' | 'defense' | 'turnovers' | 'fouls'

const PACE_MULTIPLIER: Record<string, number> = {
  slow: 0.85,
  balanced: 1,
  fast: 1.15,
}

/** Accumulate fatigue from minutes played this stint. Returns new 0–100 value. */
export function updateFatigue(
  currentFatigue: number,
  minutesPlayed: number,
  pace: 'slow' | 'balanced' | 'fast' = 'balanced',
  isHighUsage = false,
): number {
  const paceMult = PACE_MULTIPLIER[pace] ?? 1
  const usageMult = isHighUsage ? 1.2 : 1
  const gain = minutesPlayed * 2.8 * paceMult * usageMult
  return clamp(currentFatigue + gain, 0, 100)
}

/** Penalty applied to makeChance / defense / turnover rates. Negative = worse. */
export function applyFatiguePenalty(
  fatigue: number,
  stat: FatigueStat,
): number {
  if (fatigue <= 50) return 0
  const excess = fatigue - 50
  const scale = stat === 'shooting' || stat === 'defense' ? 0.001 : 0.0008
  return -(excess * scale)
}

export function recoverFatigue(currentFatigue: number, daysOff: number): number {
  const recovery = daysOff * 12
  return clamp(currentFatigue - recovery, 0, 100)
}

export function isHighUsagePlayer(player: Player): boolean {
  return player.tendencies.usageRate >= 22
}

export function fatigueForPlayer(
  player: Player,
  gameFatigue: Record<string, number> | undefined,
): number {
  return gameFatigue?.[player.id] ?? player.fatigue ?? 0
}
