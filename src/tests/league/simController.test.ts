// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { simGamesOnDate } from '@/game/league/simController'
import { createSimSessionState } from '@/game/league/gameFinalization'
import { initializeStandings } from '@/game/league/standingsEngine'
import { SeededRandom } from '@/game/sim/rng'
import { makeTeam, makeRoster, resetFixtureCounters, emptyM10LeagueFields } from '@/tests/fixtures'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import type { GameSave } from '@/game/models'
import type { ScheduledGame } from '@/game/models/game'

const GAME_DATE = '2025-10-21'

function makeScheduledGame(
  id: string,
  homeTeamId: string,
  awayTeamId: string,
): ScheduledGame {
  return {
    id,
    season: '2025-26',
    date: GAME_DATE,
    homeTeamId,
    awayTeamId,
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
    boxScoreId: null,
    isConference: true,
    isDivision: false,
    seasonYear: 2025,
    isUserTeamGame: homeTeamId === 'user' || awayTeamId === 'user',
  }
}

function makeSimSave(): GameSave {
  const t1 = makeTeam({ id: 'user', abbreviation: 'USR' })
  const t2 = makeTeam({ id: 'other-a', abbreviation: 'OTA' })
  const t3 = makeTeam({ id: 'other-b', abbreviation: 'OTB' })
  const t4 = makeTeam({ id: 'other-c', abbreviation: 'OTC' })
  const teams = [t1, t2, t3, t4]
  const players: GameSave['league']['players'] = {}

  for (const team of teams) {
    const roster = makeRoster(team.id, 8)
    for (const player of roster) {
      players[player.id] = player
      team.roster.push(player.id)
    }
    team.lineup.starters = roster.slice(0, 5).map((p) => p.id)
    team.lineup.bench = roster.slice(5).map((p) => p.id)
  }

  const games: Record<string, ScheduledGame> = {
    'user-game': makeScheduledGame('user-game', 'user', 'other-a'),
    'league-game': makeScheduledGame('league-game', 'other-b', 'other-c'),
  }

  return {
    metadata: {
      id: 'sim-test',
      name: 'Sim Test',
      createdAt: '2025-10-21T00:00:00.000Z',
      updatedAt: '2025-10-21T00:00:00.000Z',
      appVersion: '0.1.0',
      schemaVersion: 9,
      teamId: 'user',
      teamName: 'User Team',
      currentSeason: 2025,
      currentDate: GAME_DATE,
      leagueName: 'Sim Test',
      snapshotId: 'nba-2025-26',
      notes: '',
    },
    league: {
      id: 'league-1',
      name: 'Sim Test',
      currentDate: GAME_DATE,
      seasonYear: 2025,
      phase: 'regular_season',
      rules: DEFAULT_LEAGUE_RULES,
      eraConfig: {
        season: '2025-26',
        pace: 100,
        league3PARate: 0.35,
        leagueTsPct: 0.57,
        leaguePpg: 112,
        possessionCoefficient: 1,
      },
      snapshotId: 'nba-2025-26',
      teams: Object.fromEntries(teams.map((t) => [t.id, t])),
      players,
      games,
      standings: initializeStandings(teams, '2025-26', 82),
      scheduleGenerated: true,
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
    },
    user: { managerName: 'GM', teamId: 'user' },
    settings: {
      difficulty: 'pro',
      simSpeed: 'instant',
      autoSave: false,
      injuries: false,
      fatigue: false,
      salaryCap: true,
      startSeason: '2025-26',
      snapshotId: 'nba-2025-26',
    },
    rngState: { seed: 'sim-day-cascade', position: 0 },
  }
}

beforeEach(() => {
  resetFixtureCounters()
})

describe('simGamesOnDate', () => {
  it('simulates all scheduled regular-season games on the date when a primary game is provided', async () => {
    const save = makeSimSave()
    const rng = new SeededRandom(save.rngState)
    const session = createSimSessionState(save.league)

    const results = await simGamesOnDate(
      save,
      GAME_DATE,
      rng,
      session,
      'user-game',
    )

    expect(results).toHaveLength(2)
    expect(save.league.games['user-game']!.status).toBe('final')
    expect(save.league.games['league-game']!.status).toBe('final')
    expect(results.some((r) => r.gameId === 'user-game')).toBe(true)
    expect(results.some((r) => r.gameId === 'league-game')).toBe(true)
  })

  it('skips playoff games on the same date', async () => {
    const save = makeSimSave()
    save.league.games['playoff-game'] = {
      ...makeScheduledGame('playoff-game', 'other-a', 'other-b'),
      playoffSeriesId: 'east-r1-1',
      playoffRound: 1,
      playoffGameNumber: 1,
    }

    const rng = new SeededRandom(save.rngState)
    const session = createSimSessionState(save.league)
    const results = await simGamesOnDate(save, GAME_DATE, rng, session, 'user-game')

    expect(results).toHaveLength(2)
    expect(save.league.games['playoff-game']!.status).toBe('scheduled')
  })
})
