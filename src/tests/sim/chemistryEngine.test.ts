// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  updateChemistry,
  chemistryTradePenalty,
  chemistryRecoveryGames,
  chemistryEffects,
} from '@/game/sim/chemistryEngine'

describe('chemistryEngine', () => {
  it('raises chemistry on winning records', () => {
    const next = updateChemistry(50, {
      wins: 45,
      losses: 15,
      recentTrades: 0,
      continuity: 60,
      egoConflicts: 0,
      winStreak: 0,
      loseStreak: 0,
    })
    expect(next).toBeGreaterThan(50)
  })

  it('penalizes chemistry after trades', () => {
    const stable = updateChemistry(60, {
      wins: 30,
      losses: 30,
      recentTrades: 0,
      continuity: 60,
      egoConflicts: 0,
      winStreak: 0,
      loseStreak: 0,
    })
    const shaken = updateChemistry(60, {
      wins: 30,
      losses: 30,
      recentTrades: 2,
      continuity: 60,
      egoConflicts: 0,
      winStreak: 0,
      loseStreak: 0,
    })
    expect(shaken).toBeLessThan(stable)
  })

  it('scales trade penalty with magnitude', () => {
    expect(chemistryTradePenalty(2)).toBeGreaterThan(chemistryTradePenalty(1))
  })

  it('returns positive sim bonuses for high chemistry', () => {
    const effects = chemistryEffects(80)
    expect(effects.clutchBonus).toBeGreaterThan(0)
  })

  it('estimates longer recovery after bigger trades when losing', () => {
    const big = chemistryRecoveryGames(2, 0.4)
    const small = chemistryRecoveryGames(1, 0.4)
    expect(big).toBeGreaterThan(small)
  })
})
