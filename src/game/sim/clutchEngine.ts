import type { Player } from '@/game/models/player'
import { clamp } from '@/lib/utils'

const CLUTCH_WINDOW_SECONDS = 5 * 60
const CLUTCH_MARGIN = 5
const STAR_CLUTCH_BONUS = 0.05
const LOW_CLUTCH_PENALTY = 0.03

export function isClutch(
  period: number,
  timeRemainingSeconds: number,
  homeScore: number,
  awayScore: number,
): boolean {
  const inLateGame = period >= 4
  const inWindow = timeRemainingSeconds <= CLUTCH_WINDOW_SECONDS
  const closeGame = Math.abs(homeScore - awayScore) <= CLUTCH_MARGIN
  return inLateGame && inWindow && closeGame
}

/** Adjust makeChance for clutch time. Chemistry 0–100 scales bonus up to +2%. */
export function applyClutchAdjustments(
  shooter: Player,
  clutch: boolean,
  teamChemistry = 50,
): number {
  if (!clutch) return 0

  const clutchRating = shooter.ratings.clutch
  let adj = 0
  if (clutchRating >= 75) {
    adj += STAR_CLUTCH_BONUS
  } else if (clutchRating < 55) {
    adj -= LOW_CLUTCH_PENALTY
  } else {
    adj += ((clutchRating - 70) / 30) * STAR_CLUTCH_BONUS
  }

  const chemistryBonus = ((teamChemistry - 50) / 50) * 0.02
  return clamp(adj + chemistryBonus, -0.05, 0.08)
}

export function clutchUsageWeight(player: Player, clutch: boolean): number {
  if (!clutch) return 1
  const usage = Math.max(2, player.tendencies.usageRate)
  const clutchBoost = 1 + (player.ratings.clutch - 50) / 100
  return usage * clutchBoost
}
