// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  computeOverall,
  computeProductionImpact,
  computeRealOverall,
  OVERALL_WEIGHTS,
  getPositionWeights,
} from '@/game/ratings/overallWeights'
import type { PlayerRatings } from '@/game/models/ratings'
import type { Position } from '@/game/models/position'
import type { PlayerSeasonStats } from '@/game/models/playerSeasonStats'

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
    it('returns 99 for an all-100 PG', () => {
      expect(computeOverall(makeFilledRatings(100), 'PG')).toBe(99)
    })

    it('returns 0 for an all-0 PG', () => {
      expect(computeOverall(makeFilledRatings(0), 'PG')).toBe(0)
    })

    it('computes a specific PG example', () => {
      const ratings = makeRatings({ ballHandling: 90, passing: 85 })
      const overall = computeOverall(ratings, 'PG')
      expect(overall).toBeGreaterThanOrEqual(60)
      expect(overall).toBeLessThanOrEqual(65)
    })

    it('computes a specific C example', () => {
      const ratings = makeRatings({ insideScoring: 95, defensiveRebound: 90, interiorDefense: 85 })
      const overall = computeOverall(ratings, 'C')
      expect(overall).toBeGreaterThanOrEqual(70)
      expect(overall).toBeLessThanOrEqual(85)
    })

    it('non-linear curve stretches the top end', () => {
      const base = makeFilledRatings(70)
      const elite = makeFilledRatings(95)
      const baseOverall = computeOverall(base, 'SF')
      const eliteOverall = computeOverall(elite, 'SF')
      expect(eliteOverall).toBeGreaterThan(baseOverall)
      expect(eliteOverall).toBeGreaterThanOrEqual(99)
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

  describe('computeProductionImpact', () => {
    function makeStats(overrides: Partial<PlayerSeasonStats> = {}): PlayerSeasonStats {
      return {
        playerId: 'test', season: '2024-25', teamId: 't1',
        gamesPlayed: 70, minutes: 2400, starts: 70,
        points: 1400, rebounds: 400, offensiveRebounds: 80, defensiveRebounds: 320,
        assists: 350, steals: 80, blocks: 40, turnovers: 180, fouls: 150,
        fgm: 500, fga: 1000, tpm: 150, tpa: 400, ftm: 200, fta: 250,
        tsPct: 0.58, efgPct: 0.52, per: 16, usageRate: 22,
        winShares: 5, boxPlusMinus: 2, vorp: 2.5,
        ...overrides,
      }
    }

    it('returns 0 for zero-minute stats', () => {
      expect(computeProductionImpact(makeStats({ gamesPlayed: 0, minutes: 0 }))).toBe(0)
    })

    it('returns a value for a starter-level stat line', () => {
      const impact = computeProductionImpact(makeStats())
      expect(impact).toBeGreaterThanOrEqual(55)
      expect(impact).toBeLessThanOrEqual(85)
    })

    it('returns higher impact for a star stat line', () => {
      const star = makeStats({
        points: 2000, assists: 500, rebounds: 500,
        per: 25, boxPlusMinus: 8, usageRate: 30, tsPct: 0.62,
      })
      const starter = makeStats()
      expect(computeProductionImpact(star)).toBeGreaterThan(computeProductionImpact(starter))
    })

    it('clamps to 99 for historically great stats', () => {
      const goat = makeStats({
        gamesPlayed: 82, minutes: 3200, starts: 82,
        points: 2600, assists: 700, rebounds: 600,
        per: 32, boxPlusMinus: 12, usageRate: 35, tsPct: 0.65,
      })
      expect(computeProductionImpact(goat)).toBe(99)
    })
  })

  describe('computeRealOverall', () => {
    function makeStats(overrides: Partial<PlayerSeasonStats> = {}): PlayerSeasonStats {
      return {
        playerId: 'test', season: '2024-25', teamId: 't1',
        gamesPlayed: 70, minutes: 2400, starts: 70,
        points: 1400, rebounds: 400, offensiveRebounds: 80, defensiveRebounds: 320,
        assists: 350, steals: 80, blocks: 40, turnovers: 180, fouls: 150,
        fgm: 500, fga: 1000, tpm: 150, tpa: 400, ftm: 200, fta: 250,
        tsPct: 0.58, efgPct: 0.52, per: 16, usageRate: 22,
        winShares: 5, boxPlusMinus: 2, vorp: 2.5,
        ...overrides,
      }
    }

    it('falls back to skill overall when no stats', () => {
      const ratings = makeRatings({ ballHandling: 80, passing: 75 })
      const stats = makeStats({ gamesPlayed: 0, minutes: 0 })
      expect(computeRealOverall(ratings, 'PG', stats)).toBe(computeOverall(ratings, 'PG'))
    })

    it('produces higher overall than skill-only for a star', () => {
      const ratings = makeRatings({ insideScoring: 80, threePoint: 75, passing: 70 })
      const stats = makeStats({
        points: 2200, assists: 500, per: 24, boxPlusMinus: 7,
        usageRate: 28, tsPct: 0.61, gamesPlayed: 75, minutes: 2700,
      })
      const skillOnly = computeOverall(ratings, 'SG')
      const real = computeRealOverall(ratings, 'SG', stats)
      expect(real).toBeGreaterThan(skillOnly)
    })

    it('star PG with good stats reaches 85+', () => {
      const ratings = makeRatings({
        ballHandling: 90, passing: 88, threePoint: 82, speed: 85,
        perimeterDefense: 75, offensiveIq: 80,
      })
      const stats = makeStats({
        points: 2200, assists: 650, per: 26, boxPlusMinus: 8,
        usageRate: 30, tsPct: 0.62, gamesPlayed: 75, minutes: 2700,
      })
      expect(computeRealOverall(ratings, 'PG', stats)).toBeGreaterThanOrEqual(85)
    })
  })
})
