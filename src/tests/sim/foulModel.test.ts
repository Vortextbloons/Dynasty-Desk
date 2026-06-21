// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  shootingFoulChance,
  nonShootingFoulChance,
  resolveFoul,
  resolveTechnical,
  isFlagrantEjection,
  isTechnicalEjection,
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
      tendencies: { foulRate: 8, freeThrowRate: 25 },
    })
    const def = makePlayer({
      id: 'd',
      ratings: { defensiveIq: 60 },
    })
    const atRim = shootingFoulChance(off, def, 'at_rim')
    const fromThree = shootingFoulChance(off, def, 'corner_three')
    expect(atRim).toBeGreaterThan(fromThree)
  })

  it('centers draw more fouls than point guards', () => {
    const center = makePlayer({
      id: 'c',
      position: 'C',
      tendencies: { foulRate: 8, freeThrowRate: 25 },
    })
    const pg = makePlayer({
      id: 'pg',
      position: 'PG',
      tendencies: { foulRate: 8, freeThrowRate: 25 },
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
  it('returns shooting or flagrant foul on shot', () => {
    const rng = new SeededRandom(createRngState('foul'))
    const def = makePlayer({ id: 'd' })
    const off = makePlayer({ id: 'o' })
    for (let i = 0; i < 20; i++) {
      const r = resolveFoul(def, off, true, rng)
      expect(['shooting', 'flagrant']).toContain(r.kind)
      expect(r.onShot).toBe(true)
      expect(r.playerId).toBe('d')
      expect(r.fouledPlayerId).toBe('o')
    }
  })

  it('returns non-shooting, offensive, or flagrant when not on shot', () => {
    const rng = new SeededRandom(createRngState('foul2'))
    const def = makePlayer({ id: 'd' })
    const off = makePlayer({ id: 'o' })
    let nonShooting = 0
    let offensive = 0
    let flagrant = 0
    for (let i = 0; i < 1000; i++) {
      const r = resolveFoul(def, off, false, rng)
      if (r.kind === 'non_shooting') nonShooting++
      if (r.kind === 'offensive') offensive++
      if (r.kind === 'flagrant') flagrant++
    }
    expect(nonShooting + offensive + flagrant).toBe(1000)
    expect(nonShooting).toBeGreaterThan(700)
  })

  it('resolveTechnical returns null most of the time', () => {
    const rng = new SeededRandom(createRngState('tech'))
    let techCount = 0
    for (let i = 0; i < 1000; i++) {
      const r = resolveTechnical(rng, ['p1', 'p2', 'p3'])
      if (r) techCount++
    }
    expect(techCount).toBeGreaterThan(0)
    expect(techCount).toBeLessThan(50)
  })

  it('ejection thresholds work', () => {
    expect(isFlagrantEjection(1)).toBe(false)
    expect(isFlagrantEjection(2)).toBe(true)
    expect(isTechnicalEjection(1)).toBe(false)
    expect(isTechnicalEjection(2)).toBe(true)
  })
})
