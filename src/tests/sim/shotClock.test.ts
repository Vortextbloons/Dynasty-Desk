// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { lateClockMakePenalty } from '@/game/sim/shotClock'
import { SeededRandom } from '@/game/sim/rng'
import { shotClockHandler } from '@/game/sim/shotClock'

describe('shotClock', () => {
  it('late-clock shots have lower make penalty magnitude', () => {
    expect(lateClockMakePenalty(true, 1)).toBeLessThan(0)
    expect(lateClockMakePenalty(false, 10)).toBe(0)
  })

  it('can produce shot clock violation', () => {
    const rng = new SeededRandom({ seed: 'shot-clock-violation', position: 0 })
    let violation = false
    for (let i = 0; i < 50; i++) {
      const result = shotClockHandler(1, {
        shotClockRemaining: 1,
        period: 4,
        timeRemainingSeconds: 30,
        possessionType: 'half_court',
      }, rng)
      if (result.violation) violation = true
    }
    expect(violation).toBe(true)
  })
})
