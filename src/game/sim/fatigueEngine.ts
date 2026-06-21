import type { Player } from '@/game/models/player'
import { clamp } from '@/lib/utils'
import {
  FATIGUE_GAIN_PER_MINUTE,
  FATIGUE_HIGH_USAGE_MULTIPLIER,
  FATIGUE_PENALTY_THRESHOLD,
  FATIGUE_SHOOTING_DEFENSE_SCALE,
  FATIGUE_TO_FOUL_SCALE,
  FATIGUE_RECOVERY_PER_DAY,
  CRUNCH_TIME_MINUTES,
} from '@/game/sim/simConstants'

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
  isCrunchTime = false,
): number {
  const paceMult = PACE_MULTIPLIER[pace] ?? 1
  const usageMult = isHighUsage ? FATIGUE_HIGH_USAGE_MULTIPLIER : 1
  let gain = minutesPlayed * FATIGUE_GAIN_PER_MINUTE * paceMult * usageMult
  if (isCrunchTime) {
    gain *= 0.5
  }
  return clamp(currentFatigue + gain, 0, 100)
}

export function isCrunchTime(period: number, secondsRemaining: number): boolean {
  if (period >= 5) return true
  if (period === 4 && secondsRemaining <= CRUNCH_TIME_MINUTES * 60) return true
  return false
}

/** Penalty applied to makeChance / defense / turnover rates. Negative = worse. */
export function applyFatiguePenalty(
  fatigue: number,
  stat: FatigueStat,
): number {
  if (fatigue <= FATIGUE_PENALTY_THRESHOLD) return 0
  const excess = fatigue - FATIGUE_PENALTY_THRESHOLD
  const scale = stat === 'shooting' || stat === 'defense' ? FATIGUE_SHOOTING_DEFENSE_SCALE : FATIGUE_TO_FOUL_SCALE
  return -(excess * scale)
}

export function recoverFatigue(currentFatigue: number, daysOff: number): number {
  const recovery = daysOff * FATIGUE_RECOVERY_PER_DAY
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
