// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  resolvePossession,
  selectPrimaryPlayer,
  selectPossessionType,
  selectShotType,
  selectDefender,
  offenseThreePointRate,
  type PossessionInput,
} from '@/game/sim/possessionEngine'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { makePlayer } from '@/tests/sim/fixtures'
import { MODERN_ERA_CONFIG } from '@/game/models/eraConfig'
import type { Player } from '@/game/models/player'
import { isThreePointZone } from '@/game/sim/shotZones'

function team(count: number, prefix: string): Player[] {
  return Array.from({ length: count }, (_, i) => makePlayer({ id: `${prefix}${i + 1}` }))
}

import { defaultStrategy } from '@/game/models/defaults'

function baseInput(overrides: Partial<PossessionInput> = {}): PossessionInput {
  const strategy = defaultStrategy()
  return {
    offense: team(5, 'o'),
    defense: team(5, 'd'),
    offenseTeamId: 't1',
    defenseTeamId: 't2',
    homeOffense: true,
    closingMinutes: false,
    fatigueByPlayer: {},
    fatigueEnabled: false,
    era: MODERN_ERA_CONFIG,
    threePointRate: 0.4,
    possessionType: 'half_court',
    period: 1,
    timeRemainingSeconds: 600,
    baseTimeSeconds: 15,
    minutesPlayed: {},
    offenseStrategy: strategy,
    defenseStrategy: strategy,
    teamChemistry: 50,
    homeScore: 50,
    awayScore: 48,
    ...overrides,
  }
}

describe('resolvePossession', () => {
  it('returns plausible PossessionResult shape', () => {
    const rng = new SeededRandom(createRngState('pe'))
    for (let i = 0; i < 100; i++) {
      const r = resolvePossession(baseInput(), rng)
      expect([0, 1, 2, 3]).toContain(r.points)
      expect(r.timeElapsedSeconds).toBeGreaterThan(0)
      expect(typeof r.possessionChange).toBe('boolean')
      expect(r.events.length).toBeGreaterThan(0)
      for (const ev of r.events) {
        if (ev.type === 'shot' && ev.made) {
          expect(['at_rim', 'short_mid', 'long_mid', 'corner_three', 'above_break_three']).toContain(ev.zone)
        }
      }
    }
  })

  it('produces plausible point distribution over 100 possessions', () => {
    const rng = new SeededRandom(createRngState('pe-dist'))
    let totalPoints = 0
    for (let i = 0; i < 100; i++) {
      const r = resolvePossession(baseInput(), rng)
      totalPoints += r.points
    }
    expect(totalPoints).toBeGreaterThan(60)
    expect(totalPoints).toBeLessThan(150)
  })

  it('no made shot produces more than 3 points', () => {
    const rng = new SeededRandom(createRngState('pe-pts'))
    for (let i = 0; i < 200; i++) {
      const r = resolvePossession(baseInput(), rng)
      for (const ev of r.events) {
        if (ev.type === 'shot' && ev.made) {
          const expectedPoints = isThreePointZone(ev.zone) ? 3 : 2
          const actualPoints = ev.zone === 'at_rim' ? 2 : expectedPoints
          expect(actualPoints).toBeLessThanOrEqual(3)
          expect(actualPoints).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })

  it('offensive rebound keeps possession', () => {
    const rng = new SeededRandom(createRngState('pe-oreb'))
    let foundOreb = false
    for (let i = 0; i < 500 && !foundOreb; i++) {
      const r = resolvePossession(baseInput(), rng)
      if (r.reboundType === 'offensive') {
        expect(r.possessionChange).toBe(false)
        foundOreb = true
      }
    }
    expect(foundOreb).toBe(true)
  })

  it('turnover results in zero points and possession change', () => {
    const rng = new SeededRandom(createRngState('pe-to'))
    let foundTurnover = false
    for (let i = 0; i < 500 && !foundTurnover; i++) {
      const r = resolvePossession(baseInput(), rng)
      if (r.turnoverType) {
        expect(r.points).toBe(0)
        expect(r.possessionChange).toBe(true)
        expect(r.events.some((ev) => ev.type === 'turnover')).toBe(true)
        foundTurnover = true
      }
    }
    expect(foundTurnover).toBe(true)
  })

  it('foul produces free throw events and points <= 3', () => {
    const rng = new SeededRandom(createRngState('pe-foul'))
    let foundFoul = false
    for (let i = 0; i < 500 && !foundFoul; i++) {
      const r = resolvePossession(baseInput(), rng)
      if (r.fouled) {
        expect(r.points).toBeGreaterThanOrEqual(0)
        expect(r.points).toBeLessThanOrEqual(3)
        const ftEvents = r.events.filter((ev) => ev.type === 'freeThrow')
        expect(ftEvents.length).toBeGreaterThan(0)
        for (const ft of ftEvents) {
          expect(typeof ft.made).toBe('boolean')
        }
        foundFoul = true
      }
    }
    expect(foundFoul).toBe(true)
  })

  it('defensive rebound causes possession change', () => {
    const rng = new SeededRandom(createRngState('pe-dreb'))
    let foundDreb = false
    for (let i = 0; i < 500 && !foundDreb; i++) {
      const r = resolvePossession(baseInput(), rng)
      if (r.reboundType === 'defensive') {
        expect(r.possessionChange).toBe(true)
        expect(r.points).toBe(0)
        foundDreb = true
      }
    }
    expect(foundDreb).toBe(true)
  })

  it('made shot always scores correct points for zone', () => {
    const rng = new SeededRandom(createRngState('pe-pts2'))
    for (let i = 0; i < 300; i++) {
      const r = resolvePossession(baseInput(), rng)
      if (r.shotMade && r.shotZone) {
        if (isThreePointZone(r.shotZone)) {
          expect(r.points).toBe(3)
        } else {
          expect(r.points).toBe(2)
        }
      }
    }
  })
})

describe('selectPrimaryPlayer', () => {
  it('throws on empty offense', () => {
    const rng = new SeededRandom(createRngState('pe-empty'))
    expect(() => selectPrimaryPlayer([], {}, rng)).toThrow()
  })

  it('higher usage players are chosen more often', () => {
    const offense = [
      makePlayer({ id: 'star', tendencies: { usageRate: 35 } }),
      makePlayer({ id: 'bench', tendencies: { usageRate: 10 } }),
    ]
    const rng = new SeededRandom(createRngState('pe-usage'))
    let starPicks = 0
    for (let i = 0; i < 200; i++) {
      const p = selectPrimaryPlayer(offense, { star: 30, bench: 10 }, rng)
      if (p.id === 'star') starPicks++
    }
    expect(starPicks).toBeGreaterThan(140)
  })
})

describe('selectPossessionType', () => {
  it('is mostly half-court, some transition', () => {
    const rng = new SeededRandom(createRngState('pe-type'))
    let transition = 0
    for (let i = 0; i < 1000; i++) {
      if (selectPossessionType(rng) === 'transition') transition++
    }
    expect(transition).toBeGreaterThan(80)
    expect(transition).toBeLessThan(280)
  })
})

describe('selectShotType', () => {
  it('returns transition in transition possessions', () => {
    const rng = new SeededRandom(createRngState('pe-st'))
    const p = makePlayer({ id: 'p' })
    for (let i = 0; i < 20; i++) {
      expect(selectShotType('transition', p, rng)).toBe('transition')
    }
  })

  it('half-court returns one of catch_and_shoot | pull_up | drive | post_up', () => {
    const rng = new SeededRandom(createRngState('pe-st2'))
    const p = makePlayer({ id: 'p' })
    for (let i = 0; i < 20; i++) {
      const t = selectShotType('half_court', p, rng)
      expect(['catch_and_shoot', 'pull_up', 'drive', 'post_up']).toContain(t)
    }
  })
})
