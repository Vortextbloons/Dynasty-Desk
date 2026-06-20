import { describe, it, expect } from 'vitest'
import {
  validateTradeLegality,
  executeTrade,
} from '@/game/management/tradeEngine'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import { createContract } from '@/game/models/contract'
import { getLeagueRules } from '@/game/models/leagueRules'
import type { LeagueState } from '@/game/models/league'
import type { Player } from '@/game/models/player'
import type { Team } from '@/game/models/team'
import type { DraftPick } from '@/game/models/draft'
import type { TradeProposal } from '@/game/models/trade'

const rules = getLeagueRules('2025-26')

function p(id: string, salary: number, years: number, teamId: string, ntc = false): Player {
  return makePlayer({
    id,
    teamId,
    contract: createContract({ salaryByYear: Array.from({ length: years }, () => salary), yearsRemaining: years, noTradeClause: ntc }),
  })
}

function t(id: string, payroll: number, roster: string[]): Team {
  return makeTeam({
    id,
    roster,
    finances: {
      ...makeTeam().finances,
      payroll,
    },
  })
}

function baseLeague(teams: Team[], players: Player[], picks: DraftPick[] = []): LeagueState {
  return {
    id: 'lg',
    name: 'Test',
    currentDate: '2025-10-21',
    seasonYear: 2025,
    phase: 'regular_season',
    rules,
    eraConfig: { season: '2025-26' } as never,
    snapshotId: 'nba-2025-26',
    teams: Object.fromEntries(teams.map((tm) => [tm.id, tm])),
    players: Object.fromEntries(players.map((pl) => [pl.id, pl])),
    games: {},
    standings: {},
    scheduleGenerated: false,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: picks,
    draftClasses: {},
    champions: [],
    awards: [],
    activeProposals: [],
    userTeamId: 'a',
  }
}

function fillRoster(teamId: string, targetSize: number, baseSalary: number): Player[] {
  const players: Player[] = []
  for (let i = 0; i < targetSize; i++) {
    players.push(p(`${teamId}-p-${i}`, baseSalary, 1, teamId))
  }
  return players
}

describe('validateTradeLegality', () => {
  it('rejects proposals with 1 team', () => {
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [{ teamId: 'a', outgoing: [], incoming: [] }],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    const result = validateTradeLegality(proposal, baseLeague([], []), rules)
    expect(result.legal).toBe(false)
  })

  it('below apron: 20M out, 22M in is legal', () => {
    const a1 = p('a1', 20_000_000, 2, 'a')
    const b1 = p('b1', 22_000_000, 2, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 12, 1_000_000)
    const a = t('a', 100_000_000, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...extraB.map((e) => e.id)])
    const league = baseLeague([a, b], [a1, b1, ...extraA, ...extraB])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'a1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(proposal, league, rules).legal).toBe(true)
  })

  it('at first apron: 20M out, 22M in is illegal (10% rule)', () => {
    const a1 = p('a1', 20_000_000, 2, 'a')
    const b1 = p('b1', 23_000_000, 2, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 12, 1_000_000)
    const a = t('a', rules.apron, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...extraB.map((e) => e.id)])
    const league = baseLeague([a, b], [a1, b1, ...extraA, ...extraB])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'a1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(proposal, league, rules).legal).toBe(false)
  })

  it('NTC player cannot be traded', () => {
    const a1 = p('a1', 20_000_000, 2, 'a', true)
    const b1 = p('b1', 20_000_000, 2, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 12, 1_000_000)
    const a = t('a', 100_000_000, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...extraB.map((e) => e.id)])
    const league = baseLeague([a, b], [a1, b1, ...extraA, ...extraB])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'a1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(proposal, league, rules).legal).toBe(false)
  })

  it('roster size floor enforced', () => {
    const a1 = p('a1', 20_000_000, 2, 'a')
    const b1 = p('b1', 20_000_000, 2, 'b')
    const b2 = p('b2', 20_000_000, 2, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 11, 1_000_000)
    const a = t('a', 100_000_000, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', 'b2', ...extraB.map((e) => e.id)])
    const league = baseLeague([a, b], [a1, b1, b2, ...extraA, ...extraB])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }, { type: 'player', playerId: 'b2' }], incoming: [{ type: 'player', playerId: 'a1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(proposal, league, rules).legal).toBe(false)
  })

  it('Stepien-blocked pick is rejected', () => {
    const a1 = p('a1', 5_000_000, 1, 'a')
    const b1 = p('b1', 5_000_000, 1, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 12, 1_000_000)
    const a = t('a', 100_000_000, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...extraB.map((e) => e.id)])
    const pick: DraftPick = {
      id: 'pick-1',
      season: '2025-26',
      round: 1,
      pickNumber: 15,
      originalTeamId: 'a',
      currentTeamId: 'a',
      prospectId: null,
      stepienBlocked: true,
    }
    const league = baseLeague([a, b], [a1, b1, ...extraA, ...extraB], [pick])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'pick', pickId: 'pick-1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'pick', pickId: 'pick-1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(proposal, league, rules).legal).toBe(false)
  })

  it('cash 1M legal, 1.5M illegal', () => {
    const a1 = p('a1', 20_000_000, 2, 'a')
    const b1 = p('b1', 21_000_000, 2, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 12, 1_000_000)
    const a = t('a', 100_000_000, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...extraB.map((e) => e.id)])
    const league = baseLeague([a, b], [a1, b1, ...extraA, ...extraB])

    const ok: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }, { type: 'cash', cashAmount: 1_000_000 }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'a1' }, { type: 'cash', cashAmount: 1_000_000 }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(ok, league, rules).legal).toBe(true)

    const bad: TradeProposal = {
      ...ok,
      id: 'p2',
      sides: ok.sides.map((s) => ({
        ...s,
        outgoing: s.outgoing.map((a2) => (a2.type === 'cash' ? { ...a2, cashAmount: 1_500_000 } : a2)),
      })),
    }
    expect(validateTradeLegality(bad, league, rules).legal).toBe(false)
  })

  it('3-team: A->B->C->A with all sides legal', () => {
    const aExtra = fillRoster('a', 12, 1_000_000)
    const bExtra = fillRoster('b', 12, 1_000_000)
    const cExtra = fillRoster('c', 12, 1_000_000)
    const a1 = p('a1', 5_000_000, 1, 'a')
    const b1 = p('b1', 5_000_000, 1, 'b')
    const c1 = p('c1', 5_000_000, 1, 'c')
    const a = t('a', 100_000_000, ['a1', ...aExtra.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...bExtra.map((e) => e.id)])
    const c = t('c', 100_000_000, ['c1', ...cExtra.map((e) => e.id)])
    const league = baseLeague([a, b, c], [a1, b1, c1, ...aExtra, ...bExtra, ...cExtra])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'c1' }] },
        { teamId: 'c', outgoing: [{ type: 'player', playerId: 'c1' }], incoming: [{ type: 'player', playerId: 'a1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(proposal, league, rules).legal).toBe(true)
  })

  it('3-team: any pair illegal rejects whole trade', () => {
    const aExtra = fillRoster('a', 12, 1_000_000)
    const bExtra = fillRoster('b', 12, 1_000_000)
    const cExtra = fillRoster('c', 12, 1_000_000)
    const a1 = p('a1', 20_000_000, 2, 'a')
    const b1 = p('b1', 22_000_000, 2, 'b')
    const c1 = p('c1', 5_000_000, 1, 'c')
    const a = t('a', rules.apron, ['a1', ...aExtra.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...bExtra.map((e) => e.id)])
    const c = t('c', 100_000_000, ['c1', ...cExtra.map((e) => e.id)])
    const league = baseLeague([a, b, c], [a1, b1, c1, ...aExtra, ...bExtra, ...cExtra])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'c1' }] },
        { teamId: 'c', outgoing: [{ type: 'player', playerId: 'c1' }], incoming: [{ type: 'player', playerId: 'a1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(validateTradeLegality(proposal, league, rules).legal).toBe(false)
  })
})

describe('executeTrade', () => {
  it('moves players, picks, cash; auto-creates trade exception', () => {
    const a1 = p('a1', 20_000_000, 2, 'a')
    const b1 = p('b1', 22_000_000, 1, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 12, 1_000_000)
    const a = t('a', 100_000_000, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...extraB.map((e) => e.id)])
    const pick: DraftPick = {
      id: 'pick-1',
      season: '2026-27',
      round: 1,
      pickNumber: 15,
      originalTeamId: 'a',
      currentTeamId: 'a',
      prospectId: null,
    }
    const league = baseLeague([a, b], [a1, b1, ...extraA, ...extraB], [pick])

    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }, { type: 'pick', pickId: 'pick-1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'a1' }, { type: 'pick', pickId: 'pick-1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    const result = executeTrade(proposal, league, rules)
    expect(result.events.length).toBeGreaterThan(0)
    expect(result.tradeExceptionsCreated.length).toBeGreaterThan(0)
    expect(result.league.players.a1!.teamId).toBe('b')
    expect(result.league.players.b1!.teamId).toBe('a')
    expect(result.league.draftPicks[0]!.currentTeamId).toBe('b')
    expect(result.league.transactions[0]!.type).toBe('trade')
  })

  it('throws on illegal trade', () => {
    const a1 = p('a1', 20_000_000, 2, 'a', true)
    const b1 = p('b1', 20_000_000, 2, 'b')
    const extraA = fillRoster('a', 12, 1_000_000)
    const extraB = fillRoster('b', 12, 1_000_000)
    const a = t('a', 100_000_000, ['a1', ...extraA.map((e) => e.id)])
    const b = t('b', 100_000_000, ['b1', ...extraB.map((e) => e.id)])
    const league = baseLeague([a, b], [a1, b1, ...extraA, ...extraB])
    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'a', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
        { teamId: 'b', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'a1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'draft',
    }
    expect(() => executeTrade(proposal, league, rules)).toThrow()
  })
})
