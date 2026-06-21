import type { TeamStrategy } from '@/game/models/team'
import type { EraConfig } from '@/game/models/eraConfig'
import { threePointRateForTeam } from '@/game/sim/shotZones'
import type { Player } from '@/game/models/player'
import {
  FAST_PACE_TIME_MULT,
  SLOW_PACE_TIME_MULT,
  THREE_HEAVY_3PA_BONUS,
  THREE_HEAVY_3PT_MAKE_BONUS,
  PAINT_RIM_BONUS,
  PAINT_FT_BONUS,
  PAINT_3PA_PENALTY,
  HIGH_PRESSURE_STEAL_BONUS,
  HIGH_PRESSURE_FOUL_BONUS,
  LOW_PRESSURE_STEAL_PENALTY,
  LOW_PRESSURE_FOUL_PENALTY,
  HIGH_CRASH_OREB_BONUS,
  HIGH_CRASH_TRANSITION_PENALTY,
  LOW_CRASH_OREB_PENALTY,
  LOW_CRASH_TRANSITION_PENALTY,
} from '@/game/sim/simConstants'

export interface PossessionAdjustments {
  possessionTimeMultiplier: number
  turnoverChanceBonus: number
  transitionRateBonus: number
  threePointRateBonus: number
  threePointMakeBonus: number
  rimAttemptBonus: number
  freeThrowRateBonus: number
  stealChanceBonus: number
  foulChanceBonus: number
  offensiveReboundBonus: number
  opponentTransitionBonus: number
}

export function defaultPossessionAdjustments(): PossessionAdjustments {
  return {
    possessionTimeMultiplier: 1,
    turnoverChanceBonus: 0,
    transitionRateBonus: 0,
    threePointRateBonus: 0,
    threePointMakeBonus: 0,
    rimAttemptBonus: 0,
    freeThrowRateBonus: 0,
    stealChanceBonus: 0,
    foulChanceBonus: 0,
    offensiveReboundBonus: 0,
    opponentTransitionBonus: 0,
  }
}

export function applyStrategyToPossession(
  strategy: TeamStrategy,
): PossessionAdjustments {
  const adj = defaultPossessionAdjustments()
  const { offense, defense } = strategy

  if (offense.pace === 'fast') {
    adj.possessionTimeMultiplier = FAST_PACE_TIME_MULT
    adj.turnoverChanceBonus = 0.03
    adj.transitionRateBonus = 0.05
  } else if (offense.pace === 'slow') {
    adj.possessionTimeMultiplier = SLOW_PACE_TIME_MULT
    adj.turnoverChanceBonus = -0.01
    adj.transitionRateBonus = -0.03
  }

  if (offense.shotProfile === 'three_heavy') {
    adj.threePointRateBonus = THREE_HEAVY_3PA_BONUS
    adj.threePointMakeBonus = THREE_HEAVY_3PT_MAKE_BONUS
  } else if (offense.shotProfile === 'paint') {
    adj.rimAttemptBonus = PAINT_RIM_BONUS
    adj.freeThrowRateBonus = PAINT_FT_BONUS
    adj.threePointRateBonus = PAINT_3PA_PENALTY
  }

  if (offense.crashOffensiveGlass === 'high') {
    adj.offensiveReboundBonus = HIGH_CRASH_OREB_BONUS
    adj.opponentTransitionBonus = HIGH_CRASH_TRANSITION_PENALTY
  } else if (offense.crashOffensiveGlass === 'low') {
    adj.offensiveReboundBonus = LOW_CRASH_OREB_PENALTY
    adj.opponentTransitionBonus = LOW_CRASH_TRANSITION_PENALTY
  }

  if (defense.pressure === 'high') {
    adj.stealChanceBonus = HIGH_PRESSURE_STEAL_BONUS
    adj.foulChanceBonus = HIGH_PRESSURE_FOUL_BONUS
  } else if (defense.pressure === 'low') {
    adj.stealChanceBonus = LOW_PRESSURE_STEAL_PENALTY
    adj.foulChanceBonus = LOW_PRESSURE_FOUL_PENALTY
  }

  if (defense.reboundingFocus === 'secure_boards') {
    adj.offensiveReboundBonus -= 0.01
  } else if (defense.reboundingFocus === 'leak_out') {
    adj.opponentTransitionBonus += 0.02
  }

  return adj
}

export function strategyThreePointRate(
  offense: readonly Player[],
  strategy: TeamStrategy,
  era: EraConfig,
): number {
  const base = threePointRateForTeam(offense, era)
  const adj = applyStrategyToPossession(strategy)
  return Math.min(0.55, Math.max(0.15, base + adj.threePointRateBonus))
}

export function extraPossessionsPerGame(strategy: TeamStrategy): number {
  if (strategy.offense.pace === 'fast') return 5
  if (strategy.offense.pace === 'slow') return -4
  return 0
}

export function strategyPreviewLines(strategy: TeamStrategy): string[] {
  const adj = applyStrategyToPossession(strategy)
  const lines: string[] = []
  if (strategy.offense.pace === 'fast') {
    lines.push('~+5 possessions, +3% turnovers, +5% transition rate')
  } else if (strategy.offense.pace === 'slow') {
    lines.push('~-4 possessions, fewer turnovers')
  }
  if (strategy.offense.shotProfile === 'three_heavy') {
    lines.push('+10 3PA, +2% 3P%')
  } else if (strategy.offense.shotProfile === 'paint') {
    lines.push('+5 rim attempts, +3% FT rate')
  }
  if (strategy.defense.pressure === 'high') {
    lines.push('+2% steals, +3% fouls')
  }
  if (adj.offensiveReboundBonus > 0) {
    lines.push('+3% offensive rebounds, +2% opponent transition')
  }
  return lines.length > 0 ? lines : ['Balanced — no major stat skew']
}
