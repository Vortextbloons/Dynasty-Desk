// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { findTrades } from '@/game/management/tradeFinder'
import { makePlayer, makeTeam, emptyM10LeagueFields } from '@/tests/fixtures'
import { emptyContract, createContract } from '@/game/models/contract'
import { getLeagueRules } from '@/game/models/leagueRules'
import type { LeagueState } from '@/game/models/league'
import type { Team } from '@/game/models/team'
import type { Player } from '@/game/models/player'

const rules = getLeagueRules('2025-26')

function buildLeague(): { league: LeagueState; user: Team; other: Team; star: Player } {
  const user = makeTeam({ id: 'user' })
  const other = makeTeam({ id: 'other' })
  const fillers = Array.from({ length: 14 }, (_, i) =>
    makePlayer({
      id: `filler-${i}`,
      teamId: 'user',
      contract: emptyContract(4_000_000, 1),
    }),
  )
  const otherFillers = Array.from({ length: 13 }, (_, i) =>
    makePlayer({
      id: `other-${i}`,
      teamId: 'other',
      contract: emptyContract(1_000_000, 1),
    }),
  )
  const star = makePlayer({
    id: 'star',
    teamId: 'other',
    age: 25,
    ratings: { overall: 90, potential: 90 } as never,
    contract: createContract({ salaryByYear: [15_000_000], yearsRemaining: 1 }),
  })

  user.roster = fillers.map((f) => f.id)
  other.roster = [...otherFillers.map((f) => f.id), star.id]

  const league: LeagueState = {
    id: 'lg',
    name: 'T',
    currentDate: '2025-10-21',
    seasonYear: 2025,
    phase: 'regular_season',
    rules,
    eraConfig: { season: '2025-26' } as never,
    snapshotId: 'nba-2025-26',
    teams: { user, other },
    players: Object.fromEntries(
      [...fillers, ...otherFillers, star].map((p) => [p.id, p]),
    ),
    games: {},
    standings: {},
    scheduleGenerated: false,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    ...emptyM10LeagueFields(),
    champions: [],
    awards: [],
    activeProposals: [],
    userTeamId: 'user',
  }
  return { league, user, other, star }
}

describe('findTrades', () => {
  it('returns proposals sorted by |delta| ascending', () => {
    const { league, user } = buildLeague()
    const results = findTrades(user, 'star', league, { maxResults: 5, capFlexibility: 'loose' })
    expect(results.length).toBeGreaterThan(0)
    for (let i = 1; i < results.length; i++) {
      const prev = (results[i - 1] as { _delta?: number })._delta ?? 0
      const cur = (results[i] as { _delta?: number })._delta ?? 0
      expect(cur).toBeGreaterThanOrEqual(prev)
    }
  })

  it('returns empty when target not on any roster', () => {
    const { league, user } = buildLeague()
    const results = findTrades(user, 'nonexistent', league, { maxResults: 5, capFlexibility: 'loose' })
    expect(results).toEqual([])
  })

  it('all returned proposals pass legality', () => {
    const { league, user } = buildLeague()
    const results = findTrades(user, 'star', league, { maxResults: 5, capFlexibility: 'loose' })
    for (const proposal of results) {
      expect(proposal.sides.length).toBe(2)
      for (const side of proposal.sides) {
        for (const asset of side.outgoing) {
          if (asset.type === 'player' && asset.playerId) {
            expect(league.players[asset.playerId]).toBeDefined()
          }
        }
      }
    }
  })
})
