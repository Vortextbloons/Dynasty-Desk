// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { findTrades } from '@/game/management/tradeFinder'
import { validateTradeLegality } from '@/game/management/tradeEngine'
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
    rivalries: {},
    records: [],
    hallOfFame: [],
    userTeamId: 'user',
  }
  return { league, user, other, star }
}

function buildLeagueWith3Teams(): {
  league: LeagueState
  user: Team
  other: Team
  third: Team
  star: Player
  thirdPlayer: Player
} {
  const user = makeTeam({ id: 'user' })
  const other = makeTeam({ id: 'other' })
  const third = makeTeam({ id: 'third' })
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
  const thirdFillers = Array.from({ length: 13 }, (_, i) =>
    makePlayer({
      id: `third-${i}`,
      teamId: 'third',
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
  const thirdPlayer = makePlayer({
    id: 'third-star',
    teamId: 'third',
    age: 27,
    ratings: { overall: 82, potential: 75 } as never,
    contract: createContract({ salaryByYear: [8_000_000], yearsRemaining: 2 }),
  })

  user.roster = fillers.map((f) => f.id)
  other.roster = [...otherFillers.map((f) => f.id), star.id]
  third.roster = [...thirdFillers.map((f) => f.id), thirdPlayer.id]

  const allPlayers = [...fillers, ...otherFillers, ...thirdFillers, star, thirdPlayer]

  const league: LeagueState = {
    id: 'lg',
    name: 'T',
    currentDate: '2025-10-21',
    seasonYear: 2025,
    phase: 'regular_season',
    rules,
    eraConfig: { season: '2025-26' } as never,
    snapshotId: 'nba-2025-26',
    teams: { user, other, third },
    players: Object.fromEntries(allPlayers.map((p) => [p.id, p])),
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
    rivalries: {},
    records: [],
    hallOfFame: [],
    userTeamId: 'user',
  }
  return { league, user, other, third, star, thirdPlayer }
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

  it('all returned proposals pass validateTradeLegality', () => {
    const { league, user } = buildLeague()
    const results = findTrades(user, 'star', league, { maxResults: 5, capFlexibility: 'loose' })
    for (const proposal of results) {
      const result = validateTradeLegality(proposal, league, league.rules)
      expect(result.legal).toBe(true)
    }
  })
})

describe('findTrades multiTeam', () => {
  it('returns 3-team proposals when multiTeam is true', () => {
    const { league, user } = buildLeagueWith3Teams()
    const results = findTrades(user, 'star', league, {
      maxResults: 100,
      capFlexibility: 'loose',
      multiTeam: true,
    })
    expect(results.length).toBeGreaterThan(0)
    const threeTeam = results.filter((r) => r.sides.length === 3)
    expect(threeTeam.length).toBeGreaterThan(0)
    for (const proposal of threeTeam) {
      const teamIds = proposal.sides.map((s) => s.teamId)
      expect(teamIds).toContain('user')
      expect(teamIds).toContain('other')
      expect(teamIds).toContain('third')
      for (const side of proposal.sides) {
        for (const asset of side.outgoing) {
          if (asset.type === 'player' && asset.playerId) {
            expect(league.players[asset.playerId]).toBeDefined()
          }
        }
      }
    }
  })

  it('does not return 3-team proposals when multiTeam is false', () => {
    const { league, user } = buildLeagueWith3Teams()
    const results = findTrades(user, 'star', league, {
      maxResults: 10,
      capFlexibility: 'loose',
      multiTeam: false,
    })
    const threeTeam = results.filter((r) => r.sides.length === 3)
    expect(threeTeam).toHaveLength(0)
  })

  it('multiTeam proposals are sorted by |delta| ascending', () => {
    const { league, user } = buildLeagueWith3Teams()
    const results = findTrades(user, 'star', league, {
      maxResults: 100,
      capFlexibility: 'loose',
      multiTeam: true,
    })
    for (let i = 1; i < results.length; i++) {
      const prev = (results[i - 1] as { _delta?: number })._delta ?? 0
      const cur = (results[i] as { _delta?: number })._delta ?? 0
      expect(cur).toBeGreaterThanOrEqual(prev)
    }
  })
})
