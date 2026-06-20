// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeFinalsMvp, getCandidatesForFinals, computeSeasonAwards } from '@/game/league/awardsEngine'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import type { PlayoffBracket } from '@/game/models/playoff'
import type { ScheduledGame } from '@/game/models/game'
import type { BoxScoreResult } from '@/game/models/sim'

function makeBoxScore(
  playerStats: Record<string, { points: number; totalRebounds: number; assists: number; minutes: number; teamId: string }>,
): BoxScoreResult {
  const stats: Record<string, any> = {}
  for (const [id, s] of Object.entries(playerStats)) {
    stats[id] = {
      playerId: id,
      teamId: s.teamId,
      started: false,
      minutes: s.minutes,
      points: s.points,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
      offensiveRebounds: 0,
      defensiveRebounds: s.totalRebounds,
      totalRebounds: s.totalRebounds,
      assists: s.assists,
      turnovers: 0,
      steals: 0,
      blocks: 0,
      fouls: 0,
      plusMinus: 0,
      shotsAtRim: { made: 0, attempted: 0 },
      shotsShortMid: { made: 0, attempted: 0 },
      shotsLongMid: { made: 0, attempted: 0 },
      shotsCornerThree: { made: 0, attempted: 0 },
      shotsAboveBreakThree: { made: 0, attempted: 0 },
    }
  }
  return {
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeScore: 100,
    awayScore: 95,
    homeWin: true,
    overtimeOccurred: false,
    teamStats: {
      home: { teamId: 'home', points: 100, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 0, totalRebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, fastBreakPoints: 0, pointsInPaint: 0, secondChancePoints: 0, benchPoints: 0 },
      away: { teamId: 'away', points: 95, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 0, totalRebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, fastBreakPoints: 0, pointsInPaint: 0, secondChancePoints: 0, benchPoints: 0 },
    },
    playerStats: stats,
    keyPlays: [],
  }
}

describe('computeFinalsMvp', () => {
  it('returns null when finals not complete', () => {
    const bracket: PlayoffBracket = {
      seasonYear: 2026,
      format: 'top8',
      east: [],
      west: [],
      status: 'bracket',
    }
    expect(computeFinalsMvp(bracket, {})).toBeNull()
  })

  it('picks highest PTS + REB + AST in finals', () => {
    const bracket: PlayoffBracket = {
      seasonYear: 2026,
      format: 'top8',
      east: [],
      west: [],
      finals: {
        id: 'finals-r4-1',
        conference: 'Finals',
        round: 4,
        higherSeedTeamId: 'team-a',
        lowerSeedTeamId: 'team-b',
        higherSeed: 1,
        lowerSeed: 1,
        seriesLength: 7,
        higherSeedWins: 4,
        lowerSeedWins: 0,
        status: 'final',
        games: ['g1', 'g2'],
        winnerTeamId: 'team-a',
        isUpset: false,
        startDate: '2026-06-01',
      },
      status: 'complete',
      championTeamId: 'team-a',
    }

    const games: Record<string, ScheduledGame> = {
      g1: {
        id: 'g1',
        season: '2025-26',
        date: '2026-06-01',
        homeTeamId: 'team-a',
        awayTeamId: 'team-b',
        status: 'final',
        homeScore: 100,
        awayScore: 90,
        boxScoreId: 'g1',
        boxScore: makeBoxScore({
          'p1': { points: 30, totalRebounds: 8, assists: 5, minutes: 36, teamId: 'team-a' },
          'p2': { points: 20, totalRebounds: 10, assists: 3, minutes: 34, teamId: 'team-a' },
        }),
        isConference: false,
        isDivision: false,
        seasonYear: 2026,
        isUserTeamGame: false,
        winnerTeamId: 'team-a',
      },
      g2: {
        id: 'g2',
        season: '2025-26',
        date: '2026-06-03',
        homeTeamId: 'team-a',
        awayTeamId: 'team-b',
        status: 'final',
        homeScore: 105,
        awayScore: 95,
        boxScoreId: 'g2',
        boxScore: makeBoxScore({
          'p1': { points: 25, totalRebounds: 6, assists: 7, minutes: 35, teamId: 'team-a' },
          'p2': { points: 22, totalRebounds: 12, assists: 2, minutes: 33, teamId: 'team-a' },
        }),
        isConference: false,
        isDivision: false,
        seasonYear: 2026,
        isUserTeamGame: false,
        winnerTeamId: 'team-a',
      },
    }

    const mvp = computeFinalsMvp(bracket, games)
    expect(mvp).toBe('p1')
  })

  it('breaks ties by minutes played', () => {
    const bracket: PlayoffBracket = {
      seasonYear: 2026,
      format: 'top8',
      east: [],
      west: [],
      finals: {
        id: 'finals-r4-1',
        conference: 'Finals',
        round: 4,
        higherSeedTeamId: 'team-a',
        lowerSeedTeamId: 'team-b',
        higherSeed: 1,
        lowerSeed: 1,
        seriesLength: 7,
        higherSeedWins: 4,
        lowerSeedWins: 0,
        status: 'final',
        games: ['g1'],
        winnerTeamId: 'team-a',
        isUpset: false,
        startDate: '2026-06-01',
      },
      status: 'complete',
      championTeamId: 'team-a',
    }

    const games: Record<string, ScheduledGame> = {
      g1: {
        id: 'g1',
        season: '2025-26',
        date: '2026-06-01',
        homeTeamId: 'team-a',
        awayTeamId: 'team-b',
        status: 'final',
        homeScore: 100,
        awayScore: 90,
        boxScoreId: 'g1',
        boxScore: makeBoxScore({
          'p1': { points: 20, totalRebounds: 5, assists: 5, minutes: 30, teamId: 'team-a' },
          'p2': { points: 15, totalRebounds: 10, assists: 5, minutes: 36, teamId: 'team-a' },
        }),
        isConference: false,
        isDivision: false,
        seasonYear: 2026,
        isUserTeamGame: false,
        winnerTeamId: 'team-a',
      },
    }

    const mvp = computeFinalsMvp(bracket, games)
    expect(mvp).toBe('p2')
  })
})

describe('getCandidatesForFinals', () => {
  it('returns sorted candidates', () => {
    const bracket: PlayoffBracket = {
      seasonYear: 2026,
      format: 'top8',
      east: [],
      west: [],
      finals: {
        id: 'finals-r4-1',
        conference: 'Finals',
        round: 4,
        higherSeedTeamId: 'team-a',
        lowerSeedTeamId: 'team-b',
        higherSeed: 1,
        lowerSeed: 1,
        seriesLength: 7,
        higherSeedWins: 4,
        lowerSeedWins: 0,
        status: 'final',
        games: ['g1'],
        winnerTeamId: 'team-a',
        isUpset: false,
        startDate: '2026-06-01',
      },
      status: 'complete',
      championTeamId: 'team-a',
    }

    const games: Record<string, ScheduledGame> = {
      g1: {
        id: 'g1',
        season: '2025-26',
        date: '2026-06-01',
        homeTeamId: 'team-a',
        awayTeamId: 'team-b',
        status: 'final',
        homeScore: 100,
        awayScore: 90,
        boxScoreId: 'g1',
        boxScore: makeBoxScore({
          'p1': { points: 30, totalRebounds: 8, assists: 5, minutes: 36, teamId: 'team-a' },
          'p2': { points: 20, totalRebounds: 10, assists: 3, minutes: 34, teamId: 'team-a' },
        }),
        isConference: false,
        isDivision: false,
        seasonYear: 2026,
        isUserTeamGame: false,
        winnerTeamId: 'team-a',
      },
    }

    const candidates = getCandidatesForFinals(bracket, games)
    expect(candidates.length).toBe(2)
    expect(candidates[0]!.playerId).toBe('p1')
    expect(candidates[0]!.combinedStat).toBe(43)
  })
})

describe('computeSeasonAwards', () => {
  it('assigns MVP to top candidate', () => {
    const team = makeTeam({ id: 't1' })
    const star = makePlayer({
      id: 'mvp',
      teamId: team.id,
      seasonStats: {
        season: '2025-26',
        teamId: team.id,
        gamesPlayed: 82,
        minutes: 3000,
        points: 2400,
        rebounds: 500,
        assists: 400,
        steals: 100,
        blocks: 50,
        turnovers: 200,
        fieldGoalsMade: 800,
        fieldGoalsAttempted: 1500,
        threePointersMade: 250,
        threePointersAttempted: 600,
        freeThrowsMade: 550,
        freeThrowsAttempted: 620,
        plusMinus: 150,
      },
    })
    team.roster = [star.id]
    const league = {
      rules: DEFAULT_LEAGUE_RULES,
      players: { [star.id]: star },
      teams: { [team.id]: team },
      standings: {},
    } as unknown as LeagueState

    const result = computeSeasonAwards(league, '2025-26')
    expect(result.awards.some((a) => a.award === 'mvp' && a.playerId === 'mvp')).toBe(true)
  })
})
