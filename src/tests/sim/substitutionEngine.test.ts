// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { planSubstitutions, type SubstitutionContext } from '@/game/sim/substitutionEngine'
import { makePlayer } from '@/tests/sim/fixtures'
import type { LineupSettings } from '@/game/models/team'
import type { Player } from '@/game/models/player'

function makeLineup(overrides: Partial<LineupSettings> = {}): LineupSettings {
  return {
    starters: ['s1', 's2', 's3', 's4', 's5'],
    bench: ['b1', 'b2', 'b3', 'b4', 'b5'],
    closingLineup: ['s1', 's2', 's3', 'b1', 'b2'],
    targetMinutes: {
      s1: 36, s2: 36, s3: 32, s4: 32, s5: 28,
      b1: 24, b2: 18, b3: 14, b4: 8, b5: 12,
    },
    autoRotation: false,
    ...overrides,
  }
}

function makePlayerMap(): Map<string, Player> {
  const players = ['s1', 's2', 's3', 's4', 's5', 'b1', 'b2', 'b3', 'b4', 'b5']
  return new Map(players.map((id) => [id, makePlayer({ id })]))
}

function baseCtx(overrides: Partial<SubstitutionContext> = {}): SubstitutionContext {
  return {
    team: 'home',
    teamId: 't-home',
    lineup: makeLineup(),
    players: makePlayerMap(),
    onCourt: ['s1', 's2', 's3', 's4', 's5'],
    minutesPlayed: { s1: 10, s2: 10, s3: 10, s4: 10, s5: 10 },
    period: 2,
    timeRemainingSeconds: 500,
    foulsByPlayer: {},
    closingMarginLeq5: false,
    ...overrides,
  }
}

describe('planSubstitutions', () => {
  it('returns no subs when healthy and within target', () => {
    const subs = planSubstitutions(baseCtx())
    expect(subs).toHaveLength(0)
  })

  it('substitutes out a player in foul trouble', () => {
    const subs = planSubstitutions(
      baseCtx({ foulsByPlayer: { s1: 6 } }),
    )
    expect(subs.length).toBeGreaterThanOrEqual(1)
    expect(subs[0]!.out).toBe('s1')
    expect(subs[0]!.in).not.toBe('s1')
  })

  it('skips injured players on court', () => {
    const players = makePlayerMap()
    const inj = players.get('s1')!
    players.set('s1', { ...inj, health: { ...inj.health, status: 'day_to_day' } })
    const subs = planSubstitutions(baseCtx({ players }))
    const s1Out = subs.find((s) => s.out === 's1')
    expect(s1Out).toBeDefined()
  })

  it('returns closing lineup swap in Q4 last 2 min when margin ≤ 5', () => {
    const subs = planSubstitutions(
      baseCtx({
        period: 4,
        timeRemainingSeconds: 60,
        closingMarginLeq5: true,
        onCourt: ['s1', 's2', 's3', 's4', 's5'],
      }),
    )
    const outIds = subs.map((s) => s.out)
    const inIds = subs.map((s) => s.in)
    expect(inIds).toContain('b1')
    expect(inIds).toContain('b2')
    expect(outIds).toContain('s4')
    expect(outIds).toContain('s5')
  })

  it('does not swap when not in last 2 min', () => {
    const subs = planSubstitutions(
      baseCtx({
        period: 4,
        timeRemainingSeconds: 300,
        closingMarginLeq5: true,
      }),
    )
    const closingSet = new Set(['s1', 's2', 's3', 'b1', 'b2'])
    const hasClosingSwap = subs.some((s) => closingSet.has(s.in))
    expect(hasClosingSwap).toBe(false)
  })

  it('returns target-based subs when minutes exceed target', () => {
    const subs = planSubstitutions(
      baseCtx({
        minutesPlayed: {
          s1: 37, s2: 37, s3: 33, s4: 33, s5: 10,
          b1: 0, b2: 0, b3: 0, b4: 0, b5: 0,
        },
      }),
    )
    expect(subs.length).toBeGreaterThanOrEqual(1)
    expect(subs.some((s) => s.out === 's1' || s.out === 's2')).toBe(true)
  })

  it('returns no duplicate subs for the same pair', () => {
    const subs = planSubstitutions(
      baseCtx({
        foulsByPlayer: { s1: 6, s2: 6, s3: 6 },
      }),
    )
    const keys = subs.map((s) => `${s.teamId}:${s.out}->${s.in}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
