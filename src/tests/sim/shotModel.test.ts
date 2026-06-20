import { describe, it, expect } from 'vitest'
import { makeChance, resolveShot, selectZone, computeImpact } from '@/game/sim/shotModel'
import { BASE_ZONE_PCT, isThreePointZone, threePointRateForTeam } from '@/game/sim/shotZones'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { makePlayer } from '@/tests/sim/fixtures'
import { MODERN_ERA_CONFIG } from '@/game/models/eraConfig'
import type { PlayerRatings } from '@/game/models/ratings'
import type { PlayerTendencies } from '@/game/models/tendencies'
import type { ShotContext } from '@/game/sim/shotModel'

function overrideRatings(p: ReturnType<typeof makePlayer>, partial: Partial<PlayerRatings>) {
  return makePlayer({ id: p.id, position: p.position, ratings: { ...p.ratings, ...partial } as PlayerRatings })
}

function overrideTendencies(p: ReturnType<typeof makePlayer>, partial: Partial<PlayerTendencies>) {
  return makePlayer({ id: p.id, position: p.position, tendencies: { ...p.tendencies, ...partial } as PlayerTendencies })
}

function ctx(overrides: Partial<ShotContext> = {}): ShotContext {
  const offense = overrides.offenseLineup ?? [
    overrideRatings(makePlayer({ id: 'o1' }), { threePoint: 80 }),
    overrideRatings(makePlayer({ id: 'o2' }), { threePoint: 75 }),
    overrideRatings(makePlayer({ id: 'o3' }), { threePoint: 70 }),
    overrideRatings(makePlayer({ id: 'o4' }), { threePoint: 60 }),
    overrideRatings(makePlayer({ id: 'o5' }), { threePoint: 65 }),
  ]
  const defense = overrides.defenseLineup ?? [
    overrideRatings(makePlayer({ id: 'd1' }), {
      perimeterDefense: 60,
      interiorDefense: 60,
      defensiveIq: 60,
    }),
  ]
  return {
    shooter: overrides.shooter ?? (offense[0] as any),
    defender: overrides.defender ?? (defense[0] as any),
    offenseLineup: offense,
    defenseLineup: defense,
    zone: overrides.zone ?? 'at_rim',
    shotType: overrides.shotType ?? 'catch_and_shoot',
    homeOffense: overrides.homeOffense ?? false,
    inClosingMinutes: overrides.inClosingMinutes ?? false,
    shooterFatigue: overrides.shooterFatigue ?? false,
  }
}

describe('makeChance', () => {
  it('stays within [0.05, 0.95] across inputs', () => {
    const rng = new SeededRandom(createRngState('mc'))
    for (let i = 0; i < 200; i++) {
      const c = ctx({
        shooter: overrideRatings(makePlayer({ id: 'sh' }), { insideScoring: 30 + (i % 70) }),
        defender: overrideRatings(makePlayer({ id: 'df' }), { perimeterDefense: 30 + (i % 70) }),
        zone: (['at_rim', 'short_mid', 'long_mid', 'corner_three', 'above_break_three'] as const)[i % 5]!,
      })
      const v = makeChance(c)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0.05)
      expect(v).toBeLessThanOrEqual(0.95)
      rng.next()
    }
  })

  it('higher shooter rating increases makeChance for at_rim', () => {
    const low = makeChance(
      ctx({ shooter: overrideRatings(makePlayer({ id: 'low' }), { insideScoring: 40 }) }),
    )
    const high = makeChance(
      ctx({ shooter: overrideRatings(makePlayer({ id: 'high' }), { insideScoring: 95 }) }),
    )
    expect(high).toBeGreaterThan(low)
  })

  it('home offense gets a small bump', () => {
    const away = makeChance(ctx({ homeOffense: false }))
    const home = makeChance(ctx({ homeOffense: true }))
    expect(home).toBeGreaterThan(away)
  })

  it('fatigue reduces makeChance by ~0.05', () => {
    const fresh = makeChance(ctx({ shooterFatigue: false }))
    const tired = makeChance(ctx({ shooterFatigue: true }))
    expect(tired).toBeLessThan(fresh)
    expect(fresh - tired).toBeCloseTo(0.05, 5)
  })

  it('stronger contest reduces makeChance', () => {
    const weakDef = makeChance(
      ctx({
        defender: overrideRatings(makePlayer({ id: 'd-weak' }), {
          perimeterDefense: 40,
          interiorDefense: 40,
          defensiveIq: 40,
        }),
      }),
    )
    const strongDef = makeChance(
      ctx({
        defender: overrideRatings(makePlayer({ id: 'd-strong' }), {
          perimeterDefense: 95,
          interiorDefense: 95,
          defensiveIq: 95,
        }),
      }),
    )
    expect(strongDef).toBeLessThan(weakDef)
  })
})

describe('resolveShot', () => {
  it('is deterministic with same seed', () => {
    const a = new SeededRandom(createRngState('shot-a'))
    const b = new SeededRandom(createRngState('shot-a'))
    const ra = resolveShot(ctx({ zone: 'at_rim', shooterFatigue: false }), a)
    const rb = resolveShot(ctx({ zone: 'at_rim', shooterFatigue: false }), b)
    expect(ra.made).toBe(rb.made)
    expect(ra.impact).toBe(rb.impact)
  })

  it('uses base zone percentage for an average shooter at neutral conditions', () => {
    const rng = new SeededRandom(createRngState('zone-base'))
    let makes = 0
    const n = 4000
    const lineup = [
      overrideRatings(makePlayer({ id: 'avg' }), {
        insideScoring: 70,
        threePoint: 50,
        clutch: 70,
        passing: 50,
      }),
      makePlayer({ id: 'o2' }),
      makePlayer({ id: 'o3' }),
      makePlayer({ id: 'o4' }),
      makePlayer({ id: 'o5' }),
    ]
    const defender = overrideRatings(makePlayer({ id: 'avgd' }), {
      perimeterDefense: 60,
      interiorDefense: 60,
      defensiveIq: 60,
    })
    for (let i = 0; i < n; i++) {
      const r = resolveShot(
        ctx({
          zone: 'at_rim',
          offenseLineup: lineup,
          shooter: lineup[0]!,
          defender,
          shotType: 'pull_up',
          homeOffense: false,
          inClosingMinutes: false,
          shooterFatigue: false,
        }),
        rng,
      )
      if (r.made) makes++
    }
    const ratio = makes / n
    expect(ratio).toBeGreaterThan(0.55)
    expect(ratio).toBeLessThan(0.75)
  })

  it('points matches zone value when made', () => {
    const rng = new SeededRandom(createRngState('points'))
    for (let i = 0; i < 200; i++) {
      const zone = (['at_rim', 'corner_three', 'above_break_three'] as const)[i % 3]!
      const r = resolveShot(
        ctx({
          zone,
          shooter: overrideRatings(makePlayer({ id: 'p' }), {
            insideScoring: 99,
            threePoint: 99,
            midrange: 99,
            closeShot: 99,
          }),
        }),
        rng,
      )
      if (r.made) {
        expect(r.points).toBe(isThreePointZone(zone) ? 3 : 2)
      } else {
        expect(r.points).toBe(0)
      }
    }
  })
})

describe('selectZone', () => {
  it('respects at_rim frequency for a rim-heavy player', () => {
    const rng = new SeededRandom(createRngState('zone-pick'))
    const player = overrideTendencies(makePlayer({ id: 'big', position: 'C' }), {
      rimFrequency: 80,
      shortMidFrequency: 5,
      longMidFrequency: 2,
      cornerThreeFrequency: 1,
      aboveBreakThreeFrequency: 1,
      threePointRate: 5,
    })
    const counts: Record<string, number> = {}
    for (let i = 0; i < 1000; i++) {
      const z = selectZone(player, 0.3, false, rng)
      counts[z] = (counts[z] ?? 0) + 1
    }
    expect(counts.at_rim ?? 0).toBeGreaterThan(counts.corner_three ?? 0)
  })

  it('transition possessions skew rim + corner three', () => {
    const rng = new SeededRandom(createRngState('zone-trans'))
    const player = makePlayer({ id: 'trans', position: 'SF' })
    let rim = 0
    let longTwo = 0
    for (let i = 0; i < 1000; i++) {
      const z = selectZone(player, 0.4, true, rng)
      if (z === 'at_rim') rim++
      if (z === 'long_mid') longTwo++
    }
    expect(rim).toBeGreaterThan(longTwo)
  })
})

describe('computeImpact', () => {
  it('rewards made threes and especially deep bombs', () => {
    const rimMiss = computeImpact({ made: false, zone: 'at_rim', shooterId: 'a' })
    const rimMake = computeImpact({ made: true, zone: 'at_rim', shooterId: 'a' })
    const cornerMake = computeImpact({ made: true, zone: 'corner_three', shooterId: 'a' })
    const deepMake = computeImpact({ made: true, zone: 'above_break_three', shooterId: 'a' })
    expect(rimMake).toBeGreaterThan(rimMiss)
    expect(cornerMake).toBeGreaterThan(rimMake)
    expect(deepMake).toBeGreaterThanOrEqual(cornerMake)
  })
})

describe('threePointRateForTeam', () => {
  it('blends tendency with era, clamped to [0.2, 0.55]', () => {
    const lowPlayers = [overrideTendencies(makePlayer({ id: 'a' }), { threePointRate: 0 })]
    const eraLow = { ...MODERN_ERA_CONFIG, league3PARate: 0.05 }
    const low = threePointRateForTeam(lowPlayers, eraLow)
    expect(low).toBeGreaterThanOrEqual(0.2)

    const highPlayers = [overrideTendencies(makePlayer({ id: 'a' }), { threePointRate: 1 })]
    const high = threePointRateForTeam(highPlayers, MODERN_ERA_CONFIG)
    expect(high).toBeLessThanOrEqual(0.55)
  })

  it('returns era rate when no players', () => {
    const v = threePointRateForTeam([], MODERN_ERA_CONFIG)
    expect(v).toBeCloseTo(MODERN_ERA_CONFIG.league3PARate, 5)
  })
})

describe('BASE_ZONE_PCT', () => {
  it('matches modern NBA league averages', () => {
    expect(BASE_ZONE_PCT.at_rim).toBeCloseTo(0.65, 5)
    expect(BASE_ZONE_PCT.corner_three).toBeCloseTo(0.39, 5)
    expect(BASE_ZONE_PCT.above_break_three).toBeCloseTo(0.36, 5)
  })
})
