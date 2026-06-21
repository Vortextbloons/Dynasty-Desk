// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeFinalsMvp, getCandidatesForFinals, computeSeasonAwards } from '@/game/league/awardsEngine'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import type { PlayoffBracket } from '@/game/models/playoff'
import type { ScheduledGame } from '@/game/models/game'
import type { BoxScoreResult, PlayerGameStats } from '@/game/models/sim'

function makeBoxScore(
  playerStats: Record<string, { points: number; totalRebounds: number; assists: number; minutes: number; teamId: string }>,
): BoxScoreResult {
  const stats: Record<string, PlayerGameStats> = {}
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

  it('best-record team player gets 1.2x MVP multiplier', () => {
    const seasonStats = {
      season: '2025-26',
      teamId: '',
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
    }

    const team1 = makeTeam({ id: 'best' })
    const team2 = makeTeam({ id: 'good' })
    const star1 = makePlayer({ id: 'star-best', teamId: 'best', seasonStats: { ...seasonStats, teamId: 'best' } })
    const star2 = makePlayer({ id: 'star-good', teamId: 'good', seasonStats: { ...seasonStats, teamId: 'good' } })
    team1.roster = [star1.id]
    team2.roster = [star2.id]

    const league = {
      rules: DEFAULT_LEAGUE_RULES,
      players: { [star1.id]: star1, [star2.id]: star2 },
      teams: { [team1.id]: team1, [team2.id]: team2 },
      standings: {
        best: { wins: 65, losses: 17 },
        good: { wins: 55, losses: 27 },
      },
    } as unknown as LeagueState

    const result = computeSeasonAwards(league, '2025-26')
    const mvp = result.awards.find((a) => a.award === 'mvp')
    expect(mvp).toBeDefined()
    expect(mvp!.playerId).toBe('star-best')
  })

  it('assigns DPOY to player with highest defensive score', () => {
    const team = makeTeam({ id: 't1' })
    const defender = makePlayer({
      id: 'dpoy',
      teamId: team.id,
      ratings: { perimeterDefense: 95, interiorDefense: 90, defensiveIq: 92, overall: 88 } as never,
      seasonStats: {
        season: '2025-26', teamId: team.id, gamesPlayed: 82, minutes: 3000,
        points: 1200, rebounds: 600, assists: 200, steals: 150, blocks: 100,
        turnovers: 100, fieldGoalsMade: 500, fieldGoalsAttempted: 900,
        threePointersMade: 50, threePointersAttempted: 150, freeThrowsMade: 150,
        freeThrowsAttempted: 200, plusMinus: 200,
      },
    })
    team.roster = [defender.id]
    const league = {
      rules: DEFAULT_LEAGUE_RULES,
      players: { [defender.id]: defender },
      teams: { [team.id]: team },
      standings: { t1: { wins: 50, losses: 32 } },
    } as unknown as LeagueState

    const result = computeSeasonAwards(league, '2025-26')
    const dpoy = result.awards.find((a) => a.award === 'dpoy')
    expect(dpoy).toBeDefined()
    expect(dpoy!.playerId).toBe('dpoy')
  })

  it('assigns ROY to best rookie', () => {
    const team = makeTeam({ id: 't1' })
    const rookie = makePlayer({
      id: 'roy',
      teamId: team.id,
      age: 21,
      seasonStats: {
        season: '2025-26', teamId: team.id, gamesPlayed: 75, minutes: 2500,
        points: 1500, rebounds: 400, assists: 300, steals: 80, blocks: 40,
        turnovers: 150, fieldGoalsMade: 600, fieldGoalsAttempted: 1200,
        threePointersMade: 150, threePointersAttempted: 400, freeThrowsMade: 150,
        freeThrowsAttempted: 200, plusMinus: 50,
      },
      careerStats: [],
    })
    team.roster = [rookie.id]
    const league = {
      rules: DEFAULT_LEAGUE_RULES,
      players: { [rookie.id]: rookie },
      teams: { [team.id]: team },
      standings: {},
    } as unknown as LeagueState

    const result = computeSeasonAwards(league, '2025-26')
    const roy = result.awards.find((a) => a.award === 'roy')
    expect(roy).toBeDefined()
    expect(roy!.playerId).toBe('roy')
  })

  it('assigns SMOY to best bench player', () => {
    const team = makeTeam({ id: 't1', lineup: { starters: ['starter1'], bench: [], closingLineup: [], targetMinutes: {}, autoRotation: false } })
    const starter = makePlayer({ id: 'starter1', teamId: team.id, seasonStats: { season: '2025-26', teamId: team.id, gamesPlayed: 82, minutes: 3000, points: 2000, rebounds: 400, assists: 300, steals: 80, blocks: 40, turnovers: 150, fieldGoalsMade: 700, fieldGoalsAttempted: 1400, threePointersMade: 200, threePointersAttempted: 500, freeThrowsMade: 400, freeThrowsAttempted: 450, plusMinus: 100 } })
    const bench = makePlayer({
      id: 'smoy',
      teamId: team.id,
      seasonStats: {
        season: '2025-26', teamId: team.id, gamesPlayed: 80, minutes: 1800,
        points: 1200, rebounds: 300, assists: 200, steals: 60, blocks: 30,
        turnovers: 100, fieldGoalsMade: 500, fieldGoalsAttempted: 1000,
        threePointersMade: 100, threePointersAttempted: 300, freeThrowsMade: 100,
        freeThrowsAttempted: 120, plusMinus: 50,
      },
    })
    team.roster = [starter.id, bench.id]
    const league = {
      rules: DEFAULT_LEAGUE_RULES,
      players: { [starter.id]: starter, [bench.id]: bench },
      teams: { [team.id]: team },
      standings: {},
    } as unknown as LeagueState

    const result = computeSeasonAwards(league, '2025-26')
    const smoy = result.awards.find((a) => a.award === 'smoy')
    expect(smoy).toBeDefined()
  })

  it('assigns MIP to player with largest ratings delta', () => {
    const team = makeTeam({ id: 't1' })
    const mip = makePlayer({
      id: 'mip',
      teamId: team.id,
      age: 25,
      development: {
        ...({} as never),
        ratingsDelta: { insideScoring: 5, closeShot: 4, midrange: 3, threePoint: 2, freeThrow: 1, ballHandling: 3, passing: 2, offensiveIq: 4, offensiveRebound: 1, defensiveRebound: 2, perimeterDefense: 3, interiorDefense: 2, steal: 1, block: 1, defensiveIq: 3, speed: 1, strength: 2, vertical: 1, stamina: 0, durability: 0, clutch: 1, consistency: 1, potential: 0, overall: 3 },
      },
    })
    team.roster = [mip.id]
    const league = {
      rules: DEFAULT_LEAGUE_RULES,
      players: { [mip.id]: mip },
      teams: { [team.id]: team },
      standings: {},
    } as unknown as LeagueState

    const result = computeSeasonAwards(league, '2025-26')
    const mipAward = result.awards.find((a) => a.award === 'mip')
    expect(mipAward).toBeDefined()
    expect(mipAward!.playerId).toBe('mip')
  })

  it('assigns All-NBA teams with position balance (2G, 2F, 1C)', () => {
    const team = makeTeam({ id: 't1' })
    const players = [
      makePlayer({ id: 'g1', teamId: 't1', position: 'PG', seasonStats: { season: '2025-26', teamId: 't1', gamesPlayed: 82, minutes: 3000, points: 2400, rebounds: 400, assists: 600, steals: 100, blocks: 30, turnovers: 200, fieldGoalsMade: 800, fieldGoalsAttempted: 1500, threePointersMade: 250, threePointersAttempted: 600, freeThrowsMade: 550, freeThrowsAttempted: 620, plusMinus: 150 } }),
      makePlayer({ id: 'g2', teamId: 't1', position: 'SG', seasonStats: { season: '2025-26', teamId: 't1', gamesPlayed: 82, minutes: 2800, points: 2000, rebounds: 350, assists: 500, steals: 90, blocks: 20, turnovers: 180, fieldGoalsMade: 700, fieldGoalsAttempted: 1400, threePointersMade: 200, threePointersAttempted: 500, freeThrowsMade: 400, freeThrowsAttempted: 450, plusMinus: 120 } }),
      makePlayer({ id: 'f1', teamId: 't1', position: 'SF', seasonStats: { season: '2025-26', teamId: 't1', gamesPlayed: 82, minutes: 2900, points: 2200, rebounds: 500, assists: 300, steals: 80, blocks: 60, turnovers: 150, fieldGoalsMade: 750, fieldGoalsAttempted: 1400, threePointersMade: 180, threePointersAttempted: 450, freeThrowsMade: 520, freeThrowsAttempted: 580, plusMinus: 140 } }),
      makePlayer({ id: 'f2', teamId: 't1', position: 'PF', seasonStats: { season: '2025-26', teamId: 't1', gamesPlayed: 82, minutes: 2800, points: 1800, rebounds: 600, assists: 200, steals: 60, blocks: 80, turnovers: 120, fieldGoalsMade: 650, fieldGoalsAttempted: 1200, threePointersMade: 120, threePointersAttempted: 300, freeThrowsMade: 380, freeThrowsAttempted: 420, plusMinus: 100 } }),
      makePlayer({ id: 'c1', teamId: 't1', position: 'C', seasonStats: { season: '2025-26', teamId: 't1', gamesPlayed: 82, minutes: 2700, points: 1600, rebounds: 700, assists: 150, steals: 40, blocks: 120, turnovers: 100, fieldGoalsMade: 600, fieldGoalsAttempted: 1000, threePointersMade: 20, threePointersAttempted: 60, freeThrowsMade: 380, freeThrowsAttempted: 440, plusMinus: 90 } }),
    ]
    team.roster = players.map((p) => p.id)
    const playersRecord = Object.fromEntries(players.map((p) => [p.id, p]))
    const league = {
      rules: DEFAULT_LEAGUE_RULES,
      players: playersRecord,
      teams: { [team.id]: team },
      standings: { t1: { wins: 60, losses: 22 } },
    } as unknown as LeagueState

    const result = computeSeasonAwards(league, '2025-26')
    const allNba1 = result.awards.filter((a) => a.award === 'all_nba_1')
    expect(allNba1).toHaveLength(5)
  })
})
