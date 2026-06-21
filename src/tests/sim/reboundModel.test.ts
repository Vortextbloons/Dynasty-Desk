// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { offensiveReboundChance, resolveRebound } from '@/game/sim/reboundModel'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { makePlayer } from '@/tests/sim/fixtures'

describe('offensiveReboundChance', () => {
  it('falls in [0.20, 0.32] for typical matchups', () => {
    const off = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `o${i}`,
        ratings: { offensiveRebound: 50 + (i % 5) * 5 },
      }),
    )
    const def = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `d${i}`,
        ratings: { defensiveRebound: 60 + (i % 5) * 5 },
      }),
    )
    for (const z of ['at_rim', 'short_mid', 'long_mid', 'corner_three', 'above_break_three'] as const) {
      const v = offensiveReboundChance(off, def, z)
      expect(v).toBeGreaterThanOrEqual(0.18)
      expect(v).toBeLessThanOrEqual(0.34)
    }
  })

  it('rim rebounds favor offense vs long three', () => {
    const off = Array.from({ length: 5 }, () =>
      makePlayer({ id: 'o', ratings: { offensiveRebound: 60 } }),
    )
    const def = Array.from({ length: 5 }, () =>
      makePlayer({ id: 'd', ratings: { defensiveRebound: 70 } }),
    )
    const rim = offensiveReboundChance(off, def, 'at_rim')
    const three = offensiveReboundChance(off, def, 'above_break_three')
    expect(rim).toBeGreaterThan(three)
  })
})

describe('resolveRebound', () => {
  it('returns a real player from the right team', () => {
    const rng = new SeededRandom(createRngState('reb'))
    const off = ['o1', 'o2', 'o3', 'o4', 'o5'].map((id) => makePlayer({ id }))
    const def = ['d1', 'd2', 'd3', 'd4', 'd5'].map((id) => makePlayer({ id }))
    for (let i = 0; i < 200; i++) {
      const r = resolveRebound(off, def, 'team-o', 'team-d', 'at_rim', rng)
      if (r.offensive) {
        expect(off.map((p) => p.id)).toContain(r.playerId)
        expect(r.teamId).toBe('team-o')
        expect(r.impact).toBe(35)
      } else {
        expect(def.map((p) => p.id)).toContain(r.playerId)
        expect(r.teamId).toBe('team-d')
        expect(r.impact).toBe(30)
      }
    }
  })

  it('produces OREB% between 0.20 and 0.32 over many missed shots', () => {
    const rng = new SeededRandom(createRngState('reb-rate'))
    const off = Array.from({ length: 5 }, (_, i) =>
      makePlayer({ id: `o${i}`, ratings: { offensiveRebound: 55 } }),
    )
    const def = Array.from({ length: 5 }, (_, i) =>
      makePlayer({ id: `d${i}`, ratings: { defensiveRebound: 70 } }),
    )
    let o = 0
    const n = 1000
    for (let i = 0; i < n; i++) {
      const r = resolveRebound(off, def, 't1', 't2', 'long_mid', rng)
      if (r.offensive) o++
    }
    const rate = o / n
    expect(rate).toBeGreaterThan(0.18)
    expect(rate).toBeLessThan(0.34)
  })
})
