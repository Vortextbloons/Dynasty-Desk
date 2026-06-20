// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  shootingFoulChance,
  nonShootingFoulChance,
  resolveFoul,
} from '@/game/sim/foulModel'
import { positionFoulDrawnFactor } from '@/game/sim/shotZones'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { makePlayer } from '@/tests/sim/fixtures'

describe('positionFoulDrawnFactor', () => {
  it('matches the spec weights', () => {
    expect(positionFoulDrawnFactor('C')).toBe(1.3)
    expect(positionFoulDrawnFactor('PF')).toBe(1.2)
    expect(positionFoulDrawnFactor('SF')).toBe(1.0)
    expect(positionFoulDrawnFactor('SG')).toBe(0.9)
    expect(positionFoulDrawnFactor('PG')).toBe(0.85)
  })
})

describe('shootingFoulChance', () => {
  it('is higher at the rim than from three', () => {
    const off = makePlayer({
      id: 'o',
      position: 'SF',
      tendencies: { foulRate: 8, freeThrowRate: 25 } as any,
    })
    const def = makePlayer({
      id: 'd',
      ratings: { defensiveIq: 60 } as any,
    })
    const atRim = shootingFoulChance(off, def, 'at_rim')
    const fromThree = shootingFoulChance(off, def, 'corner_three')
    expect(atRim).toBeGreaterThan(fromThree)
  })

  it('centers draw more fouls than point guards', () => {
    const center = makePlayer({
      id: 'c',
      position: 'C',
      tendencies: { foulRate: 8, freeThrowRate: 25 } as any,
    })
    const pg = makePlayer({
      id: 'pg',
      position: 'PG',
      tendencies: { foulRate: 8, freeThrowRate: 25 } as any,
    })
    const def = makePlayer({ id: 'd' })
    const c = shootingFoulChance(center, def, 'at_rim')
    const p = shootingFoulChance(pg, def, 'at_rim')
    expect(c).toBeGreaterThan(p)
  })
})

describe('nonShootingFoulChance', () => {
  it('stays bounded', () => {
    for (let i = 0; i < 50; i++) {
      const d = makePlayer({ id: 'd' })
      const v = nonShootingFoulChance(d)
      expect(v).toBeGreaterThanOrEqual(0.02)
      expect(v).toBeLessThanOrEqual(0.15)
    }
  })
})

describe('resolveFoul', () => {
  it('always returns shooting foul on shot', () => {
    const rng = new SeededRandom(createRngState('foul'))
    const def = makePlayer({ id: 'd' })
    const off = makePlayer({ id: 'o' })
    for (let i = 0; i < 20; i++) {
      const r = resolveFoul(def, off, true, rng)
      expect(r.kind).toBe('shooting')
      expect(r.onShot).toBe(true)
      expect(r.playerId).toBe('d')
      expect(r.fouledPlayerId).toBe('o')
    }
  })

  it('returns non-shooting or offensive when not on shot', () => {
    const rng = new SeededRandom(createRngState('foul2'))
    const def = makePlayer({ id: 'd' })
    const off = makePlayer({ id: 'o' })
    let nonShooting = 0
    let offensive = 0
    for (let i = 0; i < 1000; i++) {
      const r = resolveFoul(def, off, false, rng)
      if (r.kind === 'non_shooting') nonShooting++
      if (r.kind === 'offensive') offensive++
    }
    expect(nonShooting + offensive).toBe(1000)
    expect(nonShooting).toBeGreaterThan(800)
  })
})
