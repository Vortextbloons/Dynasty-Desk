import { describe, it, expect } from 'vitest'
import { computeOverall, OVERALL_WEIGHTS, getPositionWeights } from '@/game/ratings/overallWeights'
import type { PlayerRatings } from '@/game/models/ratings'
import type { Position } from '@/game/models/position'

function makeRatings(overrides: Partial<PlayerRatings> = {}): PlayerRatings {
  return {
    insideScoring: 50, closeShot: 50, midrange: 50, threePoint: 50, freeThrow: 50,
    ballHandling: 50, passing: 50, offensiveIq: 50,
    offensiveRebound: 50, defensiveRebound: 50,
    perimeterDefense: 50, interiorDefense: 50, steal: 50, block: 50, defensiveIq: 50,
    speed: 50, strength: 50, vertical: 50, stamina: 50, durability: 50,
    clutch: 50, consistency: 50, potential: 50,
    overall: 50,
    ...overrides,
  }
}

function makeFilledRatings(value: number): PlayerRatings {
  return {
    insideScoring: value,
    closeShot: value,
    midrange: value,
    threePoint: value,
    freeThrow: value,
    ballHandling: value,
    passing: value,
    offensiveIq: value,
    offensiveRebound: value,
    defensiveRebound: value,
    perimeterDefense: value,
    interiorDefense: value,
    steal: value,
    block: value,
    defensiveIq: value,
    speed: value,
    strength: value,
    vertical: value,
    stamina: value,
    durability: value,
    clutch: value,
    consistency: value,
    potential: value,
    overall: value,
  }
}

describe('overallWeights', () => {
  describe('weight sums', () => {
    for (const position of ['PG', 'SG', 'SF', 'PF', 'C'] as Position[]) {
      it(`${position} weights sum to 1.0`, () => {
        const weights = OVERALL_WEIGHTS[position]
        const sum = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0)
        expect(sum).toBeCloseTo(1.0, 3)
      })
    }
  })

  describe('computeOverall', () => {
    it('returns 100 for an all-100 PG', () => {
      expect(computeOverall(makeFilledRatings(100), 'PG')).toBe(100)
    })

    it('returns 0 for an all-0 PG', () => {
      expect(computeOverall(makeFilledRatings(0), 'PG')).toBe(0)
    })

    it('computes a specific PG example as 61', () => {
      const ratings = makeRatings({ ballHandling: 90, passing: 85 })
      expect(computeOverall(ratings, 'PG')).toBe(61)
    })

    it('computes a specific C example as 68', () => {
      const ratings = makeRatings({ insideScoring: 95, defensiveRebound: 90, interiorDefense: 85 })
      expect(computeOverall(ratings, 'C')).toBe(68)
    })
  })

  describe('getPositionWeights', () => {
    it('returns weights for each position', () => {
      for (const pos of ['PG', 'SG', 'SF', 'PF', 'C'] as Position[]) {
        const weights = getPositionWeights(pos)
        expect(Object.keys(weights).length).toBeGreaterThan(0)
      }
    })
  })
})
