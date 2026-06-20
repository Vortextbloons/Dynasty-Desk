// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  applyStrategyToPossession,
  extraPossessionsPerGame,
} from '@/game/sim/strategyEngine'
import { defaultStrategy } from '@/game/models/defaults'

describe('strategyEngine', () => {
  it('fast pace increases turnovers and transition', () => {
    const strategy = defaultStrategy()
    strategy.offense.pace = 'fast'
    const adj = applyStrategyToPossession(strategy)
    expect(adj.turnoverChanceBonus).toBeGreaterThan(0)
    expect(adj.transitionRateBonus).toBeGreaterThan(0)
    expect(extraPossessionsPerGame(strategy)).toBe(5)
  })

  it('aggressive defense increases steals and fouls', () => {
    const strategy = defaultStrategy()
    strategy.defense.pressure = 'high'
    const adj = applyStrategyToPossession(strategy)
    expect(adj.stealChanceBonus).toBeGreaterThan(0)
    expect(adj.foulChanceBonus).toBeGreaterThan(0)
  })
})
