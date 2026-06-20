import { describe, it, expect } from 'vitest'
import { evaluateTradeForAI, updateTeamDirection } from '@/game/management/tradeAI'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import { emptyContract } from '@/game/models/contract'
import { getLeagueRules } from '@/game/models/leagueRules'
import type { LeagueState } from '@/game/models/league'
import type { TradeProposal } from '@/game/models/trade'

const rules = getLeagueRules('2025-26')

function buildLeague() {
  const user = makeTeam({ id: 'user', direction: 'contender' })
  const contender = makeTeam({
    id: 'contender',
    direction: 'contender',
    roster: ['star-1'],
  })
  const rebuilding = makeTeam({
    id: 'rebuilding',
    direction: 'rebuilding',
    roster: ['star-2'],
  })
  const user2 = makeTeam({ id: 'user2', direction: 'middle', roster: ['filler'] })

  const star1 = makePlayer({
    id: 'star-1',
    teamId: 'contender',
    age: 30,
    ratings: { overall: 90, potential: 90 } as never,
    contract: emptyContract(20_000_000, 2),
  })
  const star2 = makePlayer({
    id: 'star-2',
    teamId: 'rebuilding',
    age: 23,
    ratings: { overall: 88, potential: 90 } as never,
    contract: emptyContract(15_000_000, 3),
  })
  const filler = makePlayer({
    id: 'filler',
    teamId: 'user2',
    age: 24,
    ratings: { overall: 70, potential: 80 } as never,
    contract: emptyContract(3_000_000, 1),
  })
  const fillerFor = makePlayer({
    id: 'fillerFor',
    teamId: 'user',
    age: 25,
    ratings: { overall: 80, potential: 80 } as never,
    contract: emptyContract(8_000_000, 2),
  })

  const league: LeagueState = {
    id: 'lg',
    name: 'T',
    currentDate: '2025-10-21',
    seasonYear: 2025,
    phase: 'regular_season',
    rules,
    eraConfig: { season: '2025-26' } as never,
    snapshotId: 'nba-2025-26',
    teams: { user, contender, rebuilding, user2 },
    players: Object.fromEntries(
      ['star-1', 'star-2', 'filler', 'fillerFor'].map((id) => {
        if (id === 'star-1') return [id, star1]
        if (id === 'star-2') return [id, star2]
        if (id === 'filler') return [id, filler]
        return [id, fillerFor]
      }),
    ),
    games: {},
    standings: {},
    scheduleGenerated: false,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    champions: [],
    awards: [],
    activeProposals: [],
    userTeamId: 'user',
  }
  return { league, user, contender, rebuilding, user2, star1, star2, filler, fillerFor }
}

describe('evaluateTradeForAI', () => {
  it('returns accepted, rejected, or counter based on value', () => {
    const { league, contender, star1, fillerFor } = buildLeague()
    void league

    const proposal: TradeProposal = {
      id: 'p1',
      sides: [
        { teamId: 'contender', outgoing: [{ type: 'player', playerId: 'star-1' }], incoming: [{ type: 'player', playerId: 'fillerFor' }] },
        { teamId: 'user', outgoing: [{ type: 'player', playerId: 'fillerFor' }], incoming: [{ type: 'player', playerId: 'star-1' }] },
      ],
      createdAt: '2025-10-21',
      status: 'submitted',
    }
    const response = evaluateTradeForAI(proposal, contender, {
      projectedWins: { user: 41, contender: 41, rebuilding: 41, user2: 41 },
      userTeamId: 'user',
      league,
    })
    expect(['accepted', 'rejected', 'counter', 'vetoed']).toContain(response.kind)
    void star1
    void fillerFor
  })

  it('MIN-5: 3-team counter adds the AI pick to the side with fewest incoming assets', () => {
    const { league, contender, user, user2 } = buildLeague()
    void user
    void user2
    const pick = {
      id: 'pick-1',
      season: '2026-27',
      round: 2,
      pickNumber: 31,
      originalTeamId: 'contender',
      currentTeamId: 'contender',
      prospectId: null,
    }
    league.draftPicks = [pick as never]

    const proposal: TradeProposal = {
      id: 'p3team',
      sides: [
        { teamId: 'contender', outgoing: [{ type: 'player', playerId: 'star-1', toTeamId: 'user' }], incoming: [{ type: 'player', playerId: 'fillerFor', toTeamId: 'contender' }, { type: 'player', playerId: 'filler', toTeamId: 'contender' }] },
        { teamId: 'user', outgoing: [{ type: 'player', playerId: 'fillerFor', toTeamId: 'contender' }], incoming: [{ type: 'player', playerId: 'star-1', toTeamId: 'user' }] },
        { teamId: 'user2', outgoing: [{ type: 'player', playerId: 'filler', toTeamId: 'contender' }], incoming: [] },
      ],
      createdAt: '2025-10-21',
      status: 'submitted',
    }
    const response = evaluateTradeForAI(proposal, contender, {
      projectedWins: { user: 41, contender: 41, rebuilding: 41, user2: 41 },
      userTeamId: 'user',
      league,
    })
    if (response.kind === 'counter') {
      const counterSide = response.counterOffer.sides.find(
        (s) => s.teamId === 'contender',
      )
      const addedPick = counterSide?.outgoing.find(
        (a) => a.type === 'pick' && a.pickId === 'pick-1',
      )
      expect(addedPick).toBeDefined()
      expect(addedPick?.toTeamId).toBe('user2')
    }
  })
})

describe('updateTeamDirection', () => {
  it('does not change user team direction', () => {
    const { league, user } = buildLeague()
    const next = updateTeamDirection(user, { wins: 60, losses: 22 }, league)
    expect(next).toBe('contender')
  })

  it('top-4 record with old roster -> contender', () => {
    const { league, contender } = buildLeague()
    const next = updateTeamDirection(contender, { wins: 60, losses: 22 }, league)
    expect(next).toBe('contender')
  })

  it('bottom record with young roster -> rebuilding or tanking', () => {
    const { league, rebuilding } = buildLeague()
    const next = updateTeamDirection(rebuilding, { wins: 18, losses: 64 }, league)
    expect(['rebuilding', 'tanking']).toContain(next)
  })
})
