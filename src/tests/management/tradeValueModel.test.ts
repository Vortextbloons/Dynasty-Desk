// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  computePlayerValue,
  computePickValue,
  computeTradeValueDelta,
  type TradeValueContext,
} from '@/game/management/tradeValueModel'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import { emptyContract, createContract } from '@/game/models/contract'

describe('computePlayerValue', () => {
  it('young star rates higher than veteran star of same OVR', () => {
    const young = makePlayer({
      id: 'young',
      age: 22,
      ratings: { overall: 85, potential: 95 } as never,
    })
    const veteran = makePlayer({
      id: 'veteran',
      age: 33,
      ratings: { overall: 85, potential: 70 } as never,
    })
    const team = makeTeam()
    const youngValue = computePlayerValue(young, team, {
      teamDirection: 'middle',
      positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 },
    })
    const vetValue = computePlayerValue(veteran, team, {
      teamDirection: 'middle',
      positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 },
    })
    expect(youngValue).toBeGreaterThan(vetValue)
  })

  it('long bad contract reduces value', () => {
    const good = makePlayer({
      id: 'good',
      age: 28,
      ratings: { overall: 80, potential: 80 } as never,
      contract: emptyContract(10_000_000, 1),
    })
    const badContract = makePlayer({
      id: 'bad',
      age: 28,
      ratings: { overall: 80, potential: 80 } as never,
      contract: createContract({
        salaryByYear: [40_000_000, 40_000_000, 40_000_000, 40_000_000],
        yearsRemaining: 4,
      }),
    })
    const team = makeTeam()
    const ctx = { teamDirection: 'middle' as const, positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } }
    const goodVal = computePlayerValue(good, team, ctx)
    const badVal = computePlayerValue(badContract, team, ctx)
    expect(badVal).toBeLessThan(goodVal)
  })

  it('rebuilding team values young players more than contender', () => {
    const young = makePlayer({
      id: 'y',
      age: 22,
      ratings: { overall: 75, potential: 90 } as never,
    })
    const team = makeTeam()
    const rebuild = computePlayerValue(young, team, {
      teamDirection: 'rebuilding',
      positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 },
    })
    const contender = computePlayerValue(young, team, {
      teamDirection: 'contender',
      positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 },
    })
    expect(rebuild).toBeGreaterThan(contender)
  })

  it('NTC applies penalty', () => {
    const noClause = makePlayer({ id: 'a' })
    const ntc = makePlayer({
      id: 'b',
      contract: createContract({ salaryByYear: [10_000_000], yearsRemaining: 1, noTradeClause: true }),
    })
    const team = makeTeam()
    const ctx = { teamDirection: 'middle' as const, positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } }
    const a = computePlayerValue(noClause, team, ctx)
    const b = computePlayerValue(ntc, team, ctx)
    expect(a).toBeGreaterThan(b)
  })

  it('applies positionBonus * need to player value', () => {
    const player = makePlayer({ id: 'pg-test', position: 'PG', ratings: { overall: 70, potential: 70 } as never })
    const team = makeTeam()
    const ctxNoNeed: TradeValueContext = { teamDirection: 'middle', positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } }
    const ctxNeed: TradeValueContext = { teamDirection: 'middle', positionNeed: { PG: 1, SG: 0, SF: 0, PF: 0, C: 0 } }
    const valNoNeed = computePlayerValue(player, team, ctxNoNeed)
    const valNeed = computePlayerValue(player, team, ctxNeed)
    expect(Number.isFinite(valNoNeed)).toBe(true)
    expect(Number.isFinite(valNeed)).toBe(true)
    expect(valNeed).toBeGreaterThan(valNoNeed)
  })
})

describe('computePickValue', () => {
  it('2nd round pick is 15', () => {
    const pick = {
      id: 'p1',
      season: '2025-26',
      round: 2 as const,
      pickNumber: 35,
      originalTeamId: 't1',
      currentTeamId: 't1',
      prospectId: null,
    }
    expect(computePickValue(pick, 41)).toBe(15)
  })

  it('top 5 (low win pct) is 80', () => {
    const pick = {
      id: 'p1',
      season: '2025-26',
      round: 1 as const,
      pickNumber: 1,
      originalTeamId: 't1',
      currentTeamId: 't1',
      prospectId: null,
    }
    expect(computePickValue(pick, 15)).toBe(80)
  })

  it('lottery win pct is 60', () => {
    const pick = {
      id: 'p1',
      season: '2025-26',
      round: 1 as const,
      pickNumber: 1,
      originalTeamId: 't1',
      currentTeamId: 't1',
      prospectId: null,
    }
    expect(computePickValue(pick, 30)).toBe(60)
  })

  it('late first (high win pct) is 35', () => {
    const pick = {
      id: 'p1',
      season: '2025-26',
      round: 1 as const,
      pickNumber: 1,
      originalTeamId: 't1',
      currentTeamId: 't1',
      prospectId: null,
    }
    expect(computePickValue(pick, 60)).toBe(35)
  })
})

describe('computeTradeValueDelta', () => {
  it('returns positive delta for fair side, negative for lopsided side', () => {
    const user = makeTeam({ id: 'user' })
    const other = makeTeam({ id: 'other' })
    const star = makePlayer({ id: 'star', teamId: 'other', ratings: { overall: 90, potential: 90 } as never, age: 25, contract: emptyContract(30_000_000, 3) })
    const filler = makePlayer({ id: 'filler', teamId: 'user', ratings: { overall: 65, potential: 70 } as never, age: 25, contract: emptyContract(8_000_000, 2) })

    const sides = [
      {
        teamId: 'user',
        outgoing: [{ type: 'player' as const, playerId: 'filler' }],
        incoming: [{ type: 'player' as const, playerId: 'star' }],
      },
      {
        teamId: 'other',
        outgoing: [{ type: 'player' as const, playerId: 'star' }],
        incoming: [{ type: 'player' as const, playerId: 'filler' }],
      },
    ]

    const players = { star, filler } as never
    const picks: never[] = []
    const { perSideValue } = computeTradeValueDelta(
      sides,
      (id) => (id === 'user' ? user : other),
      (id) => players[id],
      () => undefined,
      { user: 41, other: 41 },
      { teamDirection: 'middle', positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } },
    )
    expect(perSideValue.user!.delta).toBeGreaterThan(0)
    expect(perSideValue.other!.delta).toBeLessThan(0)
    void picks
  })
})
