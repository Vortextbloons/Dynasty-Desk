import { describe, it, expect } from 'vitest'
import { rateLineup } from '@/game/ratings/lineupRatingEngine'
import { DEFAULT_LINEUP_WEIGHTS } from '@/game/ratings/lineupRatingWeights'
import type { Player } from '@/game/models/player'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test',
    firstName: 'Test',
    lastName: 'Player',
    age: 25,
    position: 'SF',
    secondaryPositions: [],
    heightInches: 78,
    weightLbs: 220,
    teamId: 'team-1',
    ratings: {
      insideScoring: 50, closeShot: 50, midrange: 50, threePoint: 50,
      freeThrow: 50, ballHandling: 50, passing: 50, offensiveIq: 50,
      offensiveRebound: 50, defensiveRebound: 50,
      perimeterDefense: 50, interiorDefense: 50, steal: 50, block: 50,
      defensiveIq: 50, speed: 50, strength: 50, vertical: 50,
      stamina: 50, durability: 50, clutch: 50, consistency: 50,
      potential: 50, overall: 50,
    },
    tendencies: {
      usageRate: 20, passRate: 20, shotRate: 20, driveRate: 10,
      postUpRate: 5, rimFrequency: 10, shortMidFrequency: 5,
      longMidFrequency: 5, cornerThreeFrequency: 5,
      aboveBreakThreeFrequency: 10, threePointRate: 10,
      freeThrowRate: 5, turnoverRate: 10, isolationRate: 5,
      pickAndRollBallHandlerRate: 5, pickAndRollRollManRate: 5,
      spotUpRate: 10, transitionRate: 10, cutRate: 5,
      foulRate: 5, stealAttemptRate: 5, blockAttemptRate: 5,
      crashOffensiveGlassRate: 5,
    },
    traits: {} as any,
    contract: {} as any,
    morale: { level: 50, happiness: 50, roleSatisfaction: 75, teamSatisfaction: 50, tradeRequest: false, tradeRequestLevel: 0 },
    health: { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0 },
    development: { lastTrainedAt: null, focusArea: null, recentForm: 50, ageAtPeak: 27, progressionCurve: 'normal', ratingsDelta: {}, breakoutChance: 0.1, bustRisk: 0.1 },
    seasonStats: {} as any,
    careerStats: [],
    historicalSeasons: [],
    ...overrides,
  }
}

describe('rateLineup', () => {
  it('returns all 12 dimensions (11 + overall)', () => {
    const players = Array.from({ length: 5 }, () => makePlayer())
    const rating = rateLineup(players)
    expect(rating).toHaveProperty('spacing')
    expect(rating).toHaveProperty('shotCreation')
    expect(rating).toHaveProperty('passing')
    expect(rating).toHaveProperty('rimPressure')
    expect(rating).toHaveProperty('perimeterDefense')
    expect(rating).toHaveProperty('interiorDefense')
    expect(rating).toHaveProperty('rebounding')
    expect(rating).toHaveProperty('transition')
    expect(rating).toHaveProperty('benchBalance')
    expect(rating).toHaveProperty('size')
    expect(rating).toHaveProperty('switchability')
    expect(rating).toHaveProperty('overall')
  })

  it('all dimensions are between 0 and 100', () => {
    const players = Array.from({ length: 5 }, () => makePlayer())
    const rating = rateLineup(players)
    for (const [, val] of Object.entries(rating)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it('lineup of 5 spacing specialists has high spacing', () => {
    const shooters = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `shooter${i}`,
        ratings: {
          insideScoring: 50, closeShot: 50, midrange: 50, threePoint: 90,
          freeThrow: 85, ballHandling: 50, passing: 50, offensiveIq: 50,
          offensiveRebound: 50, defensiveRebound: 50,
          perimeterDefense: 50, interiorDefense: 50, steal: 50, block: 50,
          defensiveIq: 50, speed: 50, strength: 50, vertical: 50,
          stamina: 50, durability: 50, clutch: 50, consistency: 50,
          potential: 50, overall: 50,
        },
      }),
    )
    const rating = rateLineup(shooters)
    expect(rating.spacing).toBeGreaterThan(70)
  })

  it('lineup of 5 defenders has high perimeter and interior defense', () => {
    const defenders = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `def${i}`,
        ratings: {
          insideScoring: 50, closeShot: 50, midrange: 50, threePoint: 50,
          freeThrow: 50, ballHandling: 50, passing: 50, offensiveIq: 50,
          offensiveRebound: 50, defensiveRebound: 50,
          perimeterDefense: 90, interiorDefense: 85, steal: 80, block: 75,
          defensiveIq: 85, speed: 50, strength: 50, vertical: 50,
          stamina: 50, durability: 50, clutch: 50, consistency: 50,
          potential: 50, overall: 50,
        },
      }),
    )
    const rating = rateLineup(defenders)
    expect(rating.perimeterDefense).toBeGreaterThan(75)
    expect(rating.interiorDefense).toBeGreaterThan(70)
  })

  it('overall follows the provided weights', () => {
    const players = Array.from({ length: 5 }, () => makePlayer())
    const rating = rateLineup(players, {}, {
      ...DEFAULT_LINEUP_WEIGHTS,
      spacing: 1,
      shotCreation: 0,
      passing: 0,
      rimPressure: 0,
      perimeterDefense: 0,
      interiorDefense: 0,
      rebounding: 0,
      transition: 0,
      benchBalance: 0,
      size: 0,
      switchability: 0,
    })
    expect(rating.overall).toBe(rating.spacing)
  })

  it('handles empty player list', () => {
    const rating = rateLineup([])
    expect(rating.spacing).toBe(0)
    expect(rating.passing).toBe(0)
    expect(typeof rating.overall).toBe('number')
  })

  it('bench balance is higher when minutes are evenly distributed', () => {
    const players = Array.from({ length: 5 }, () => makePlayer())
    const evenMinutes = { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 }
    const unevenMinutes = { p1: 80, p2: 40, p3: 30, p4: 30, p5: 60 }
    const evenRating = rateLineup(players, evenMinutes)
    const unevenRating = rateLineup(players, unevenMinutes)
    expect(evenRating.benchBalance).toBeGreaterThanOrEqual(unevenRating.benchBalance)
  })
})
