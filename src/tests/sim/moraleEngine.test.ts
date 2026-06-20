// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  updateMorale,
  shouldRequestTrade,
  moraleToConsistency,
  moraleToClutch,
} from '@/game/sim/moraleEngine'
import { emptyMorale } from '@/game/models/defaults'

describe('moraleEngine', () => {
  it('drops happiness when minutes fall well below target', () => {
    const base = emptyMorale()
    const result = updateMorale(base, {
      minutes: 18,
      targetMinutes: 32,
      isStarter: true,
      teamWins: 20,
      teamLosses: 20,
      contractValueRatio: 1,
      tradeRumors: false,
      winStreak: 0,
      loseStreak: 0,
      teamChemistry: 50,
    })
    expect(result.happiness).toBeLessThan(base.happiness)
    expect(result.roleSatisfaction).toBeLessThan(base.roleSatisfaction)
  })

  it('flags trade request at high trade request level', () => {
    const morale = { ...emptyMorale(), tradeRequestLevel: 85 }
    expect(shouldRequestTrade(morale)).toBe(true)
  })

  it('boosts consistency overlay for happy players', () => {
    const happy = { ...emptyMorale(), happiness: 80 }
    const unhappy = { ...emptyMorale(), happiness: 30 }
    expect(moraleToConsistency(happy, 70)).toBeGreaterThan(moraleToConsistency(unhappy, 70))
  })

  it('boosts clutch overlay for satisfied players', () => {
    const satisfied = { ...emptyMorale(), teamSatisfaction: 80 }
    const frustrated = { ...emptyMorale(), teamSatisfaction: 30 }
    expect(moraleToClutch(satisfied, 70)).toBeGreaterThan(moraleToClutch(frustrated, 70))
  })
})
