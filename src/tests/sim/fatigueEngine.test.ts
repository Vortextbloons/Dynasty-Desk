import { describe, it, expect } from 'vitest'
import {
  updateFatigue,
  applyFatiguePenalty,
  recoverFatigue,
} from '@/game/sim/fatigueEngine'

describe('fatigueEngine', () => {
  it('accumulates fatigue with minutes and pace', () => {
    const slow = updateFatigue(0, 12, 'slow', false)
    const fast = updateFatigue(0, 12, 'fast', false)
    expect(fast).toBeGreaterThan(slow)
  })

  it('applies larger shooting penalty at higher fatigue', () => {
    const low = applyFatiguePenalty(55, 'shooting')
    const high = applyFatiguePenalty(80, 'shooting')
    expect(high).toBeLessThan(low)
  })

  it('recovers fatigue with days off', () => {
    expect(recoverFatigue(70, 2)).toBeLessThan(70)
    expect(recoverFatigue(10, 1)).toBe(0)
  })
})
