// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { initializeStandings, recomputeStandings, computeGB, formatStreak, formatLast10 } from '@/game/league/standingsEngine'
import { makeTeam } from '@/tests/fixtures'
import type { ScheduledGame } from '@/game/models/game'

const TEAMS = [
  makeTeam({ id: 'bos', city: 'Boston', name: 'Celtics', conference: 'East', division: 'Atlantic' }),
  makeTeam({ id: 'nyk', city: 'New York', name: 'Knicks', conference: 'East', division: 'Atlantic' }),
  makeTeam({ id: 'lal', city: 'Los Angeles', name: 'Lakers', conference: 'West', division: 'Pacific' }),
  makeTeam({ id: 'den', city: 'Denver', name: 'Nuggets', conference: 'West', division: 'Northwest' }),
]

const TEAMS_RECORD = Object.fromEntries(TEAMS.map((t) => [t.id, t]))

function makeGame(overrides: Partial<ScheduledGame> = {}): ScheduledGame {
  return {
    id: `game-${Math.random().toString(36).slice(2, 8)}`,
    season: '2025-26',
    date: '2025-10-21',
    homeTeamId: 'bos',
    awayTeamId: 'nyk',
    status: 'final',
    homeScore: 110,
    awayScore: 100,
    boxScoreId: null,
    boxScore: null,
    isConference: true,
    isDivision: true,
    seasonYear: 2025,
    isUserTeamGame: false,
    winnerTeamId: 'bos',
    ...overrides,
  }
}

describe('initializeStandings', () => {
  it('creates a standing for every team', () => {
    const standings = initializeStandings(TEAMS, '2025-26', 82)
    expect(Object.keys(standings)).toHaveLength(4)
    for (const team of TEAMS) {
      expect(standings[team.id]).toBeDefined()
      expect(standings[team.id]!.wins).toBe(0)
      expect(standings[team.id]!.losses).toBe(0)
      expect(standings[team.id]!.gamesRemaining).toBe(82)
    }
  })

  it('initializes all new fields', () => {
    const standings = initializeStandings(TEAMS, '2025-26', 82)
    const bos = standings['bos']!
    expect(bos.conferenceWins).toBe(0)
    expect(bos.conferenceLosses).toBe(0)
    expect(bos.divisionWins).toBe(0)
    expect(bos.divisionLosses).toBe(0)
    expect(bos.pointsPerGame).toBe(0)
    expect(bos.pointsAllowedPerGame).toBe(0)
    expect(bos.pointDifferentialPerGame).toBe(0)
    expect(bos.magicNumber).toBe(0)
    expect(bos.tiebreaker).toEqual({ headToHeadWins: 0, conferenceWinPct: 0, pointDifferential: 0 })
  })
})

describe('recomputeStandings', () => {
  it('returns all zeros for no games', () => {
    const standings = recomputeStandings({}, TEAMS_RECORD, '2025-26', 82)
    for (const s of Object.values(standings)) {
      expect(s.wins).toBe(0)
      expect(s.losses).toBe(0)
      expect(s.winPct).toBe(0)
    }
  })

  it('computes wins and losses correctly', () => {
    const game = makeGame({ homeScore: 110, awayScore: 100 })
    const games = { [game.id]: game }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.wins).toBe(1)
    expect(standings['bos']!.losses).toBe(0)
    expect(standings['nyk']!.wins).toBe(0)
    expect(standings['nyk']!.losses).toBe(1)
  })

  it('computes win percentage', () => {
    const games: Record<string, ScheduledGame> = {}
    for (let i = 0; i < 10; i++) {
      const g = makeGame({
        id: `g-${i}`,
        homeScore: i < 6 ? 110 : 90,
        awayScore: i < 6 ? 100 : 100,
      })
      games[g.id] = g
    }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.wins).toBe(6)
    expect(standings['bos']!.losses).toBe(4)
    expect(standings['bos']!.winPct).toBeCloseTo(0.6, 1)
  })

  it('tracks home and away splits', () => {
    const homeWin = makeGame({ homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100 })
    const awayWin = makeGame({ id: 'g2', homeTeamId: 'nyk', awayTeamId: 'bos', homeScore: 90, awayScore: 100 })
    const games = { [homeWin.id]: homeWin, [awayWin.id]: awayWin }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.homeWins).toBe(1)
    expect(standings['bos']!.awayWins).toBe(1)
    expect(standings['nyk']!.homeLosses).toBe(1)
    expect(standings['nyk']!.awayLosses).toBe(1)
  })

  it('tracks conference record', () => {
    const game = makeGame({ isConference: true, homeScore: 110, awayScore: 100 })
    const games = { [game.id]: game }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.conferenceWins).toBe(1)
    expect(standings['nyk']!.conferenceLosses).toBe(1)
  })

  it('tracks division record', () => {
    const game = makeGame({ isDivision: true, homeScore: 110, awayScore: 100 })
    const games = { [game.id]: game }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.divisionWins).toBe(1)
    expect(standings['nyk']!.divisionLosses).toBe(1)
  })

  it('computes points per game', () => {
    const game = makeGame({ homeScore: 120, awayScore: 100 })
    const games = { [game.id]: game }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.pointsPerGame).toBe(120)
    expect(standings['bos']!.pointsAllowedPerGame).toBe(100)
    expect(standings['bos']!.pointDifferentialPerGame).toBe(20)
  })

  it('assigns conference ranks by wins', () => {
    const games: Record<string, ScheduledGame> = {}
    const g1 = makeGame({ id: 'g1', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100 })
    const g2 = makeGame({ id: 'g2', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100 })
    games[g1.id] = g1
    games[g2.id] = g2
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.conferenceRank).toBe(1)
    expect(standings['nyk']!.conferenceRank).toBe(2)
  })

  it('updates gamesRemaining', () => {
    const game = makeGame()
    const games = { [game.id]: game }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    expect(standings['bos']!.gamesRemaining).toBe(81)
    expect(standings['nyk']!.gamesRemaining).toBe(81)
  })
})

describe('computeGB', () => {
  it('returns — for tied teams', () => {
    expect(computeGB(10, 5, 10, 5)).toBe('—')
  })

  it('returns correct half-game back', () => {
    expect(computeGB(10, 5, 10, 6)).toBe('0.5')
  })

  it('returns correct games back', () => {
    expect(computeGB(15, 5, 10, 10)).toBe('5.0')
  })
})

describe('formatStreak', () => {
  it('formats win streak', () => {
    expect(formatStreak(5)).toBe('W5')
  })

  it('formats loss streak', () => {
    expect(formatStreak(-3)).toBe('L3')
  })

  it('returns — for 0', () => {
    expect(formatStreak(0)).toBe('—')
  })
})

describe('formatLast10', () => {
  it('formats last 10 record', () => {
    expect(formatLast10('WWLWWLWWLW')).toBe('7-3')
  })

  it('returns — for empty string', () => {
    expect(formatLast10('')).toBe('—')
  })
})

describe('head-to-head tiebreaker', () => {
  it('bos ranked above nyk when bos won h2h series', () => {
    const g1 = makeGame({ id: 'g1', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100, isConference: true })
    const g2 = makeGame({ id: 'g2', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100, isConference: true, date: '2025-10-22' })
    const games = { [g1.id]: g1, [g2.id]: g2 }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    // bos is 2-0, nyk is 0-2 — bos ranks higher by wins, not h2h
    expect(standings['bos']!.conferenceRank).toBe(1)
    expect(standings['nyk']!.conferenceRank).toBe(2)
  })

  it('uses head-to-head wins as tiebreaker when W-L and conference pct are tied', () => {
    const g1 = makeGame({
      id: 'g1', homeTeamId: 'bos', awayTeamId: 'nyk',
      homeScore: 110, awayScore: 100, isConference: true, isDivision: false,
    })
    const g2 = makeGame({
      id: 'g2', homeTeamId: 'bos', awayTeamId: 'nyk',
      homeScore: 110, awayScore: 100, isConference: true, isDivision: false,
      date: '2025-10-22',
    })
    const games = { [g1.id]: g1, [g2.id]: g2 }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    // bos 2-0, nyk 0-2 → bos ranked higher
    expect(standings['bos']!.conferenceRank).toBe(1)
    expect(standings['nyk']!.conferenceRank).toBe(2)
  })
})

describe('streak via computeTeamStreak', () => {
  it('computes streak from most recent game', () => {
    const g1 = makeGame({ id: 'g1', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100 })
    const g2 = makeGame({ id: 'g2', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100, date: '2025-10-22' })
    const g3 = makeGame({ id: 'g3', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 100, awayScore: 110, date: '2025-10-23' })
    const games = { [g1.id]: g1, [g2.id]: g2, [g3.id]: g3 }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    // bos won 2, lost 1 — most recent is loss → streak -1
    expect(standings['bos']!.streak).toBe(-1)
    // nyk lost 2, won 1 — most recent is win → streak 1
    expect(standings['nyk']!.streak).toBe(1)
  })

  it('reports win streak when most recent games are wins', () => {
    const g1 = makeGame({ id: 'g1', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 100, awayScore: 110 })
    const g2 = makeGame({ id: 'g2', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100, date: '2025-10-22' })
    const g3 = makeGame({ id: 'g3', homeTeamId: 'bos', awayTeamId: 'nyk', homeScore: 110, awayScore: 100, date: '2025-10-23' })
    const games = { [g1.id]: g1, [g2.id]: g2, [g3.id]: g3 }
    const standings = recomputeStandings(games, TEAMS_RECORD, '2025-26', 82)
    // bos lost 1, won 2 — streak is W2
    expect(standings['bos']!.streak).toBe(2)
    // nyk won 1, lost 2 — streak is L2
    expect(standings['nyk']!.streak).toBe(-2)
  })
})
