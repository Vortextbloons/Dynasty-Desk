import type { TeamStrategy } from '@/game/models/team'
import type { EraConfig } from '@/game/models/eraConfig'
import { threePointRateForTeam } from '@/game/sim/shotZones'
import type { Player } from '@/game/models/player'

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
    adj.possessionTimeMultiplier = 0.92
    adj.turnoverChanceBonus = 0.03
    adj.transitionRateBonus = 0.05
  } else if (offense.pace === 'slow') {
    adj.possessionTimeMultiplier = 1.08
    adj.turnoverChanceBonus = -0.01
    adj.transitionRateBonus = -0.03
  }

  if (offense.shotProfile === 'three_heavy') {
    adj.threePointRateBonus = 0.12
    adj.threePointMakeBonus = 0.02
  } else if (offense.shotProfile === 'paint') {
    adj.rimAttemptBonus = 0.08
    adj.freeThrowRateBonus = 0.03
    adj.threePointRateBonus = -0.06
  }

  if (offense.crashOffensiveGlass === 'high') {
    adj.offensiveReboundBonus = 0.03
    adj.opponentTransitionBonus = 0.02
  } else if (offense.crashOffensiveGlass === 'low') {
    adj.offensiveReboundBonus = -0.02
    adj.opponentTransitionBonus = -0.01
  }

  if (defense.pressure === 'high') {
    adj.stealChanceBonus = 0.02
    adj.foulChanceBonus = 0.03
  } else if (defense.pressure === 'low') {
    adj.stealChanceBonus = -0.01
    adj.foulChanceBonus = -0.01
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
