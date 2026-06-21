import type { PlayerMorale } from '@/game/models/player'
import { clamp } from '@/lib/utils'
import {
  MORALE_MINUTES_UNDER_THRESHOLD,
  MORALE_MINUTES_OVER_THRESHOLD,
  MORALE_TRADE_REQUEST_THRESHOLD,
} from '@/game/sim/simConstants'

export interface MoraleUpdateContext {
  minutes: number
  targetMinutes: number
  isStarter: boolean
  teamWins: number
  teamLosses: number
  contractValueRatio: number
  tradeRumors: boolean
  winStreak: number
  loseStreak: number
  teamChemistry: number
}

export function updateMorale(
  morale: PlayerMorale,
  ctx: MoraleUpdateContext,
): PlayerMorale {
  let happiness = morale.happiness
  let roleSatisfaction = morale.roleSatisfaction
  let teamSatisfaction = morale.teamSatisfaction
  let tradeRequestLevel = morale.tradeRequestLevel

  const minutesDelta = ctx.minutes - ctx.targetMinutes
  if (minutesDelta < MORALE_MINUTES_UNDER_THRESHOLD) {
    roleSatisfaction -= 8
    happiness -= 5
  } else if (minutesDelta > MORALE_MINUTES_OVER_THRESHOLD) {
    roleSatisfaction += 3
  }

  if (!ctx.isStarter && ctx.targetMinutes >= 28) {
    roleSatisfaction -= 6
    happiness -= 4
  }

  const total = ctx.teamWins + ctx.teamLosses
  if (total > 0) {
    const winPct = ctx.teamWins / total
    teamSatisfaction += (winPct - 0.5) * 20
    happiness += (winPct - 0.5) * 10
  }

  if (ctx.contractValueRatio < 0.85) {
    happiness -= 4
    tradeRequestLevel += 3
  } else if (ctx.contractValueRatio > 1.15) {
    happiness += 3
  }

  if (ctx.tradeRumors) {
    happiness -= 5
    tradeRequestLevel += 5
  }

  if (ctx.winStreak >= 3) {
    happiness += Math.min(8, ctx.winStreak)
    teamSatisfaction += 4
  }
  if (ctx.loseStreak >= 3) {
    happiness -= Math.min(8, ctx.loseStreak)
    teamSatisfaction -= 4
  }

  teamSatisfaction += (ctx.teamChemistry - 50) / 20

  happiness = clamp(happiness, 0, 100)
  roleSatisfaction = clamp(roleSatisfaction, 0, 100)
  teamSatisfaction = clamp(teamSatisfaction, 0, 100)
  tradeRequestLevel = clamp(tradeRequestLevel, 0, 100)

  const level = Math.round((happiness + roleSatisfaction + teamSatisfaction) / 3)
  const tradeRequest = tradeRequestLevel >= MORALE_TRADE_REQUEST_THRESHOLD

  return {
    level,
    happiness,
    roleSatisfaction,
    teamSatisfaction,
    tradeRequest,
    tradeRequestLevel,
  }
}

export function shouldRequestTrade(morale: PlayerMorale): boolean {
  return morale.tradeRequestLevel >= MORALE_TRADE_REQUEST_THRESHOLD
}

/** Morale shifts effective consistency rating for sim. */
export function moraleToConsistency(morale: PlayerMorale, baseConsistency: number): number {
  const happinessFactor = (morale.happiness - 50) / 50
  return clamp(baseConsistency + happinessFactor * 8, 30, 99)
}

export function moraleToClutch(morale: PlayerMorale, baseClutch: number): number {
  const teamFactor = (morale.teamSatisfaction - 50) / 50
  return clamp(baseClutch + teamFactor * 6, 30, 99)
}

export function moraleConsistencyModifier(morale: PlayerMorale): number {
  return ((morale.happiness - 50) / 50) * 0.03
}
