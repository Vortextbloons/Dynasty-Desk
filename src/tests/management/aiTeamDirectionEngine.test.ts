// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  updateAITeamDirection,
  directionChangeReason,
} from '@/game/management/aiTeamDirectionEngine'
import { makeTeam, makePlayer } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'

function makeLeague(team: ReturnType<typeof makeTeam>, standingRank: number): LeagueState {
  const players: Record<string, ReturnType<typeof makePlayer>> = {}
  for (let i = 0; i < 12; i++) {
    const p = makePlayer({ id: `${team.id}-p-${i}`, teamId: team.id, age: 29 })
    players[p.id] = p
    team.roster.push(p.id)
  }
  const standings = {
    [team.id]: {
      teamId: team.id,
      season: '2025-26',
      gamesPlayed: 82,
      wins: standingRank <= 4 ? 58 : standingRank > 20 ? 20 : 40,
      losses: standingRank <= 4 ? 24 : standingRank > 20 ? 62 : 42,
      winPct: 0.5,
      conferenceRank: standingRank <= 15 ? standingRank : standingRank - 15,
      divisionRank: 1,
      homeWins: 20,
      homeLosses: 11,
      awayWins: 20,
      awayLosses: 11,
      pointsFor: 9000,
      pointsAgainst: 8800,
      pointDifferential: 200,
      streak: 3,
      last10: '5-5',
      clinchedPlayoff: false,
      clinchedDivision: false,
      eliminated: false,
      conferenceWins: 30,
      conferenceLosses: 20,
      divisionWins: 12,
      divisionLosses: 8,
      pointsPerGame: 110,
      pointsAllowedPerGame: 107,
      pointDifferentialPerGame: 3,
      gamesRemaining: 0,
      magicNumber: 0,
      tiebreaker: { headToHeadWins: 0, conferenceWinPct: 0.5, pointDifferential: 0 },
    },
  } as unknown as LeagueState['standings']

  return {
    id: 'l1',
    name: 'Test',
    currentDate: '2026-06-01',
    seasonYear: 2026,
    phase: 'offseason',
    rules: DEFAULT_LEAGUE_RULES,
    eraConfig: {} as LeagueState['eraConfig'],
    snapshotId: 'test',
    teams: { [team.id]: team },
    players,
    games: {},
    standings,
    scheduleGenerated: true,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    champions: [],
    awards: [],
    activeProposals: [],
    userTeamId: 'user-team',
  } as unknown as LeagueState
}

describe('aiTeamDirectionEngine', () => {
  it('skips user team direction updates', () => {
    const team = makeTeam({ id: 'user-team', direction: 'middle' })
    const league = makeLeague(team, 10)
    expect(updateAITeamDirection(team, { wins: 20, losses: 62 }, league)).toBe('middle')
  })

  it('pushes top teams with veteran cores toward contender', () => {
    const team = makeTeam({ id: 'ai-1', direction: 'middle' })
    const league = makeLeague(team, 2)
    expect(updateAITeamDirection(team, { wins: 58, losses: 24 }, league)).toBe('contender')
  })

  it('describes direction changes with record context', () => {
    const reason = directionChangeReason(
      'middle',
      'contender',
      {
        teamId: 't1',
        season: '2025-26',
        gamesPlayed: 82,
        wins: 55,
        losses: 27,
        winPct: 0.67,
        conferenceRank: 2,
        divisionRank: 1,
        homeWins: 30,
        homeLosses: 11,
        awayWins: 25,
        awayLosses: 16,
        pointsFor: 9000,
        pointsAgainst: 8500,
        pointDifferential: 500,
        streak: 3,
        last10: '8-2',
        clinchedPlayoff: true,
        clinchedDivision: false,
        eliminated: false,
        conferenceWins: 35,
        conferenceLosses: 17,
        divisionWins: 12,
        divisionLosses: 4,
        pointsPerGame: 110,
        pointsAllowedPerGame: 104,
        pointDifferentialPerGame: 6,
        gamesRemaining: 0,
        magicNumber: 0,
        tiebreaker: { headToHeadWins: 0, conferenceWinPct: 0.6, pointDifferential: 5 },
      },
      29,
    )
    expect(reason).toContain('55-27')
    expect(reason).toContain('Top-four')
  })
})
