import { describe, it, expect } from 'vitest'
import { rateLineup } from '@/game/ratings/lineupRatingEngine'
import { makePlayer } from '@/tests/fixtures'

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

  it('computes exact spacing for five shooters', () => {
    const base = makePlayer()
    const shooters = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `shooter${i}`,
        ratings: { ...base.ratings, threePoint: 90 },
        tendencies: {
          ...base.tendencies,
          cornerThreeFrequency: 10,
          aboveBreakThreeFrequency: 10,
        },
      }),
    )

    expect(rateLineup(shooters).spacing).toBe(90)
  })

  it('computes exact passing for five facilitators', () => {
    const base = makePlayer()
    const facilitators = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `fac${i}`,
        ratings: { ...base.ratings, passing: 80, offensiveIq: 70 },
      }),
    )

    expect(rateLineup(facilitators).passing).toBe(75)
  })

  it('computes exact perimeter defense for five guards', () => {
    const base = makePlayer()
    const defenders = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `def${i}`,
        ratings: { ...base.ratings, perimeterDefense: 80, steal: 60 },
      }),
    )

    expect(rateLineup(defenders).perimeterDefense).toBe(70)
  })

  it('computes exact interior defense for five bigs', () => {
    const base = makePlayer()
    const bigs = Array.from({ length: 5 }, (_, i) =>
      makePlayer({
        id: `big${i}`,
        ratings: { ...base.ratings, interiorDefense: 70, block: 50 },
      }),
    )

    expect(rateLineup(bigs).interiorDefense).toBe(60)
  })

  it('computes exact rebounding and size', () => {
    const base = makePlayer()
    const player = makePlayer({
      id: 'big-man',
      heightInches: 78,
      weightLbs: 220,
      ratings: {
        ...base.ratings,
        offensiveRebound: 80,
        defensiveRebound: 60,
      },
    })
    const rating = rateLineup([player])

    expect(rating.rebounding).toBe(70)
    expect(rating.size).toBe(58)
  })

  it('handles empty player list', () => {
    const rating = rateLineup([])
    expect(rating.spacing).toBe(0)
    expect(rating.passing).toBe(0)
    for (const value of Object.values(rating)) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('returns finite values for all lineup dimensions', () => {
    const players = Array.from({ length: 5 }, (_, i) => makePlayer({ id: `p${i}` }))
    const rating = rateLineup(players, { p0: 36, p1: 36, p2: 32, p3: 32, p4: 32 })

    for (const value of Object.values(rating)) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })
})
