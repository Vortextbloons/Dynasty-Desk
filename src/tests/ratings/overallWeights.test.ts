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
    it('returns 50 for all-50 ratings', () => {
      const ratings = makeRatings()
      for (const pos of ['PG', 'SG', 'SF', 'PF', 'C'] as Position[]) {
        expect(computeOverall(ratings, pos)).toBe(50)
      }
    })

    it('returns higher overall for higher ratings', () => {
      const high = makeRatings({
        insideScoring: 90, threePoint: 90, passing: 90,
        speed: 90, defensiveIq: 90, offensiveIq: 90,
      })
      const low = makeRatings({
        insideScoring: 30, threePoint: 30, passing: 30,
        speed: 30, defensiveIq: 30, offensiveIq: 30,
      })
      expect(computeOverall(high, 'PG')).toBeGreaterThan(computeOverall(low, 'PG'))
    })

    it('PG guard-oriented: high ballHandling/passing boosts overall more than insideScoring', () => {
      const guard = makeRatings({ ballHandling: 95, passing: 95, insideScoring: 40 })
      const center = makeRatings({ ballHandling: 40, passing: 40, insideScoring: 95 })
      expect(computeOverall(guard, 'PG')).toBeGreaterThan(computeOverall(center, 'PG'))
    })

    it('C center-oriented: high insideScoring/defensiveRebound boosts overall more than ballHandling', () => {
      const center = makeRatings({ insideScoring: 95, defensiveRebound: 95, ballHandling: 40 })
      const guard = makeRatings({ insideScoring: 40, defensiveRebound: 40, ballHandling: 95 })
      expect(computeOverall(center, 'C')).toBeGreaterThan(computeOverall(guard, 'C'))
    })

    it('result is always an integer between 0 and 100', () => {
      const ratings = makeRatings()
      for (const pos of ['PG', 'SG', 'SF', 'PF', 'C'] as Position[]) {
        const result = computeOverall(ratings, pos)
        expect(Number.isInteger(result)).toBe(true)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(100)
      }
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
