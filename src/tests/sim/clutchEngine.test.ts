// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isClutch, applyClutchAdjustments } from '@/game/sim/clutchEngine'
import { makePlayer } from '@/tests/fixtures'

describe('clutchEngine', () => {
  it('detects clutch time in 4th within 5 points', () => {
    expect(isClutch(4, 240, 100, 98)).toBe(true)
    expect(isClutch(4, 400, 100, 98)).toBe(false)
    expect(isClutch(3, 60, 90, 88)).toBe(false)
  })

  it('boosts elite clutch shooters', () => {
    const star = makePlayer({ ratings: { clutch: 90, overall: 90 } as never })
    const role = makePlayer({ ratings: { clutch: 50, overall: 70 } as never })
    expect(applyClutchAdjustments(star, true, 60)).toBeGreaterThan(0)
    expect(applyClutchAdjustments(role, true, 60)).toBeLessThan(0)
  })
})
