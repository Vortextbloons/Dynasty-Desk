// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'

describe('SeededRandom', () => {
  it('is deterministic for the same seed', () => {
    const a = new SeededRandom(createRngState('test-seed'))
    const b = new SeededRandom(createRngState('test-seed'))
    for (let i = 0; i < 50; i++) {
      expect(a.next()).toBe(b.next())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = new SeededRandom(createRngState('alpha'))
    const b = new SeededRandom(createRngState('beta'))
    const aFirst = a.next()
    const bFirst = b.next()
    expect(aFirst).not.toBe(bFirst)
  })

  it('position increments on each call', () => {
    const rng = new SeededRandom(createRngState('pos'))
    expect(rng.position).toBe(0)
    rng.next()
    expect(rng.position).toBe(1)
    rng.next()
    rng.next()
    expect(rng.position).toBe(3)
  })

  it('position resumes from existing state', () => {
    const rng = new SeededRandom({ seed: 'pos2', position: 5 })
    expect(rng.position).toBe(5)
    rng.next()
    expect(rng.position).toBe(6)
  })

  it('nextInt is inclusive on both ends', () => {
    const rng = new SeededRandom(createRngState('int'))
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
    }
  })

  it('nextFloat is bounded', () => {
    const rng = new SeededRandom(createRngState('float'))
    for (let i = 0; i < 200; i++) {
      const v = rng.nextFloat(1.5, 2.5)
      expect(v).toBeGreaterThanOrEqual(1.5)
      expect(v).toBeLessThan(2.5)
    }
  })

  it('pick returns a member of the array', () => {
    const rng = new SeededRandom(createRngState('pick'))
    const arr = ['a', 'b', 'c', 'd']
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr))
    }
  })

  it('pick throws on empty', () => {
    const rng = new SeededRandom(createRngState('pick-empty'))
    expect(() => rng.pick([])).toThrow()
  })

  it('weightedPick respects weights', () => {
    const rng = new SeededRandom(createRngState('w'))
    const counts: Record<string, number> = { a: 0, b: 0 }
    for (let i = 0; i < 5000; i++) {
      const v = rng.weightedPick(['a', 'b'], [3, 1])
      counts[v] = (counts[v] ?? 0) + 1
    }
    expect(counts.a).toBeGreaterThan(counts.b ?? 0)
    const ratio = counts.a! / (counts.b ?? 1)
    expect(ratio).toBeGreaterThan(2)
    expect(ratio).toBeLessThan(4)
  })

  it('chance returns false for 0 and true for 1', () => {
    const rng = new SeededRandom(createRngState('chance'))
    for (let i = 0; i < 20; i++) expect(rng.chance(0)).toBe(false)
    for (let i = 0; i < 20; i++) expect(rng.chance(1)).toBe(true)
  })

  it('chance is approximately correct', () => {
    const rng = new SeededRandom(createRngState('chance-p'))
    let hits = 0
    const n = 10000
    for (let i = 0; i < n; i++) if (rng.chance(0.3)) hits++
    const ratio = hits / n
    expect(ratio).toBeGreaterThan(0.27)
    expect(ratio).toBeLessThan(0.33)
  })

  it('nextInt throws when min > max', () => {
    const rng = new SeededRandom(createRngState('bad-int'))
    expect(() => rng.nextInt(5, 3)).toThrow()
  })
})
