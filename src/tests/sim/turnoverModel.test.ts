// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { turnoverChance, resolveTurnover } from '@/game/sim/turnoverModel'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { makePlayer } from '@/tests/sim/fixtures'

describe('turnoverChance', () => {
  it('is bounded between 0.05 and 0.30', () => {
    const players = [
      makePlayer({ id: 'bh' }),
      makePlayer({
        id: 'd1',
        ratings: { perimeterDefense: 50, steal: 50, defensiveIq: 50 } as any,
      }),
    ]
    for (let t = 0; t < 50; t++) {
      const c = turnoverChance(players[0]!, [players[1]!])
      expect(c).toBeGreaterThanOrEqual(0.05)
      expect(c).toBeLessThanOrEqual(0.3)
    }
  })

  it('high turnover tendency + weak handles → ~upper bound', () => {
    const bh = makePlayer({
      id: 'risky',
      tendencies: { turnoverRate: 30 } as any,
      ratings: { ballHandling: 40, passing: 50 } as any,
    })
    const d = makePlayer({
      id: 'd1',
      ratings: { perimeterDefense: 95, steal: 95, defensiveIq: 95 } as any,
    })
    const c = turnoverChance(bh, [d])
    expect(c).toBeGreaterThan(0.15)
  })

  it('low tendency + great handles → ~lower bound', () => {
    const bh = makePlayer({
      id: 'safe',
      tendencies: { turnoverRate: 5 } as any,
      ratings: { ballHandling: 95, passing: 95 } as any,
    })
    const d = makePlayer({
      id: 'd1',
      ratings: { perimeterDefense: 40, steal: 40, defensiveIq: 40 } as any,
    })
    const c = turnoverChance(bh, [d])
    expect(c).toBeLessThan(0.15)
  })
})

describe('resolveTurnover', () => {
  it('emits a valid turnover type', () => {
    const rng = new SeededRandom(createRngState('to'))
    const bh = makePlayer({ id: 'bh' })
    const d = makePlayer({ id: 'd' })
    for (let i = 0; i < 100; i++) {
      const r = resolveTurnover(bh, [d], rng)
      expect([
        'lost_ball',
        'bad_pass',
        'offensive_foul',
        'shot_clock_violation',
        'travel',
        'three_second_violation',
        'out_of_bounds',
      ]).toContain(r.turnoverType)
      expect(r.playerId).toBe('bh')
      expect(r.impact).toBe(35)
    }
  })

  it('marks some as stolen with a defender id', () => {
    const rng = new SeededRandom(createRngState('to-st'))
    const bh = makePlayer({ id: 'bh' })
    const d1 = makePlayer({ id: 'd1' })
    const d2 = makePlayer({ id: 'd2' })
    let stolen = 0
    for (let i = 0; i < 500; i++) {
      const r = resolveTurnover(bh, [d1, d2], rng)
      if (r.isStolen) {
        stolen++
        expect(r.stolenBy).toBeTruthy()
      }
    }
    expect(stolen).toBeGreaterThan(50)
    expect(stolen).toBeLessThan(300)
  })
})
