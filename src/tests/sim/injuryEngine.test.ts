import { describe, it, expect } from 'vitest'
import { injuryChance, rollInjurySeverity } from '@/game/sim/injuryEngine'
import { makePlayer } from '@/tests/fixtures'
import { SeededRandom } from '@/game/sim/rng'

describe('injuryEngine', () => {
  it('healthy baseline near 0.5% per game', () => {
    const p = makePlayer()
    const chance = injuryChance(p, {
      minutes: 30,
      fatigue: 20,
      contact: false,
      backToBack: false,
      injuriesEnabled: true,
    })
    expect(chance).toBeGreaterThan(0.003)
    expect(chance).toBeLessThan(0.01)
  })

  it('severity distribution favors minor injuries', () => {
    const rng = new SeededRandom({ seed: 'injury-severity', position: 0 })
    const counts = { minor: 0, short: 0, long: 0, season: 0 }
    for (let i = 0; i < 1000; i++) {
      const s = rollInjurySeverity(rng)
      if (s === 'minor' || s === 'day_to_day') counts.minor++
      else if (s === 'short_term') counts.short++
      else if (s === 'long_term') counts.long++
      else counts.season++
    }
    expect(counts.minor).toBeGreaterThan(counts.short)
    expect(counts.short).toBeGreaterThan(counts.season)
  })
})
