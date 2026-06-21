// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { makeTeam, makeRoster, makePlayer, resetFixtureCounters, emptyM10LeagueFields } from '@/tests/fixtures'
import {
  generatePlayoffBracket,
  advancePlayoffSeries,
  simulateSeries,
  computeTeamSeasonResults,
  getPlayoffSeeds,
  isBracketComplete,
  getSeriesById,
} from '@/game/league/playoffEngine'
import { SeededRandom } from '@/game/sim/rng'
import type { LeagueState } from '@/game/models/league'
import type { TeamStanding } from '@/game/models/game'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'

function makeStanding(overrides: Partial<TeamStanding> = {}): TeamStanding {
  return {
    teamId: overrides.teamId ?? 'team-1',
    season: '2025-26',
    gamesPlayed: 82,
    wins: overrides.wins ?? 50,
    losses: overrides.losses ?? 32,
    winPct: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifferential: overrides.pointDifferential ?? 0,
    conferenceRank: overrides.conferenceRank ?? 1,
    divisionRank: 1,
    streak: 0,
    last10: '7-3',
    clinchedPlayoff: true,
    clinchedDivision: false,
    eliminated: false,
    conferenceWins: overrides.conferenceWins ?? 30,
    conferenceLosses: overrides.conferenceLosses ?? 22,
    divisionWins: 0,
    divisionLosses: 0,
    pointsPerGame: 0,
    pointsAllowedPerGame: 0,
    pointDifferentialPerGame: 0,
    gamesRemaining: 0,
    magicNumber: 0,
    tiebreaker: { headToHeadWins: 0, conferenceWinPct: 0, pointDifferential: 0 },
    ...overrides,
  }
}

function makeLeague(overrides: Record<string, any> = {}): LeagueState {
  const eastTeams = Array.from({ length: 10 }, (_, i) =>
    makeTeam({ id: `east-${i + 1}`, conference: 'East', abbreviation: `E${i + 1}` })
  )
  const westTeams = Array.from({ length: 10 }, (_, i) =>
    makeTeam({ id: `west-${i + 1}`, conference: 'West', abbreviation: `W${i + 1}` })
  )

  const allTeams = [...eastTeams, ...westTeams]
  const teams: Record<string, ReturnType<typeof makeTeam>> = {}
  for (const t of allTeams) teams[t.id] = t

  const players: Record<string, ReturnType<typeof makePlayer>> = {}
  for (const t of allTeams) {
    const roster = makeRoster(t.id, 15)
    for (const p of roster) {
      players[p.id] = p
      t.roster.push(p.id)
    }
    t.lineup.starters = roster.slice(0, 5).map((p) => p.id)
    t.lineup.bench = roster.slice(5).map((p) => p.id)
  }

  const eastStandings: Record<string, TeamStanding> = {}
  for (let i = 0; i < 10; i++) {
    const t = eastTeams[i]!
    eastStandings[t.id] = makeStanding({
      teamId: t.id,
      wins: 60 - i * 3,
      losses: 22 + i * 3,
      conferenceRank: i + 1,
      conferenceWins: 40 - i * 2,
      conferenceLosses: 12 + i * 2,
      pointDifferential: 500 - i * 100,
    })
  }

  const westStandings: Record<string, TeamStanding> = {}
  for (let i = 0; i < 10; i++) {
    const t = westTeams[i]!
    westStandings[t.id] = makeStanding({
      teamId: t.id,
      wins: 58 - i * 3,
      losses: 24 + i * 3,
      conferenceRank: i + 1,
      conferenceWins: 38 - i * 2,
      conferenceLosses: 14 + i * 2,
      pointDifferential: 450 - i * 100,
    })
  }

  const standings = { ...eastStandings, ...westStandings }

  const { rules: rulesOverrides, ...restOverrides } = overrides

  return {
    id: 'test',
    name: 'Test League',
    currentDate: '2026-04-10',
    seasonYear: 2026,
    phase: 'playoffs',
    rules: { ...DEFAULT_LEAGUE_RULES, ...(rulesOverrides ?? {}) },
    eraConfig: { season: '2025-26', pace: 100, league3PARate: 0.35, leagueTsPct: 0.57, leaguePpg: 112, possessionCoefficient: 1.0 },
    snapshotId: 'test',
    teams,
    players,
    games: {},
    standings,
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
    userTeamId: 'east-1',
    ...restOverrides,
  } as LeagueState
}

beforeEach(() => {
  resetFixtureCounters()
})

describe('generatePlayoffBracket', () => {
  it('produces correct number of series per conference', () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    expect(bracket.east.length).toBe(7)
    expect(bracket.west.length).toBe(7)
    expect(bracket.finals).toBeDefined()
    expect(bracket.finals!.conference).toBe('Finals')
  })

  it('seeds 1v8, 4v5, 3v6, 2v7 in R1', () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    const eastR1 = bracket.east.filter((s) => s.round === 1).sort((a, b) => a.id.localeCompare(b.id))
    expect(eastR1.length).toBe(4)

    expect(eastR1[0]!.higherSeed).toBe(1)
    expect(eastR1[0]!.lowerSeed).toBe(8)
    expect(eastR1[1]!.higherSeed).toBe(4)
    expect(eastR1[1]!.lowerSeed).toBe(5)
    expect(eastR1[2]!.higherSeed).toBe(3)
    expect(eastR1[2]!.lowerSeed).toBe(6)
    expect(eastR1[3]!.higherSeed).toBe(2)
    expect(eastR1[3]!.lowerSeed).toBe(7)
  })

  it('series IDs are stable', () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    const eastR1 = bracket.east.filter((s) => s.round === 1)
    expect(eastR1.map((s) => s.id)).toEqual(
      expect.arrayContaining(['east-r1-1', 'east-r1-2', 'east-r1-3', 'east-r1-4'])
    )
  })

  it('has play-in games when hasPlayIn is true', () => {
    const league = makeLeague({ rules: { hasPlayIn: true, playoffFormat: 'playin_then_top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    expect(bracket.playIn).toBeDefined()
    expect(bracket.playIn!.east.length).toBe(3)
    expect(bracket.playIn!.west.length).toBe(3)
    expect(bracket.status).toBe('play_in')
  })

  it('falls back to a normal bracket when play-in teams are unavailable', () => {
    const league = makeLeague({ rules: { hasPlayIn: true, playoffFormat: 'playin_then_top8' } })

    for (const teamId of ['east-5', 'east-6', 'east-7', 'east-8', 'east-9', 'east-10', 'west-5', 'west-6', 'west-7', 'west-8', 'west-9', 'west-10']) {
      delete league.teams[teamId]
      delete league.standings[teamId]
    }

    const bracket = generatePlayoffBracket(league, league.rules)

    expect(bracket.playIn).toBeUndefined()
    expect(bracket.status).toBe('bracket')
    expect(bracket.east.length).toBeGreaterThan(0)
    expect(bracket.west.length).toBeGreaterThan(0)
  })

  it('no play-in when hasPlayIn is false', () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    expect(bracket.playIn).toBeUndefined()
    expect(bracket.status).toBe('bracket')
  })

  it('auto-advances byes when only six seeds exist', () => {
    const league = makeLeague({
      rules: {
        hasPlayIn: false,
        playoffFormat: 'top8',
        playoffTeamsPerConference: 6,
      },
    })

    for (const teamId of ['east-7', 'east-8', 'east-9', 'east-10', 'west-7', 'west-8', 'west-9', 'west-10']) {
      delete league.teams[teamId]
      delete league.standings[teamId]
    }

    const bracket = generatePlayoffBracket(league, league.rules)

    const eastR1 = bracket.east.filter((s) => s.round === 1).sort((a, b) => a.id.localeCompare(b.id))
    expect(eastR1).toHaveLength(4)
    expect(eastR1.filter((s) => s.status === 'final')).toHaveLength(2)
    expect(eastR1[0]!.winnerTeamId).toBe(eastR1[0]!.higherSeedTeamId)
    expect(eastR1[3]!.winnerTeamId).toBe(eastR1[3]!.higherSeedTeamId)

    const eastR2 = bracket.east.filter((s) => s.round === 2)
    expect(eastR2).toHaveLength(2)
    expect(eastR2[0]!.higherSeedTeamId).toBe('east-1')
    expect(eastR2[1]!.lowerSeedTeamId).toBe('east-2')
  })
})

describe('advancePlayoffSeries', () => {
  it('simulates one game at a time', async () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)
    league.playoffBracket = bracket

    const rng = new SeededRandom({ seed: 'test-seed', position: 0 })
    const result = await advancePlayoffSeries(league, rng)

    expect(result.gamesSimulated).toBe(1)
    expect(result.results.length).toBe(1)
    expect(result.bracketComplete).toBe(false)
  })

  it('advances series status after games', async () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)
    league.playoffBracket = bracket

    const rng = new SeededRandom({ seed: 'test-seed', position: 0 })

    const result1 = await advancePlayoffSeries(league, rng)
    expect(result1.gamesSimulated).toBe(1)

    const eastR1 = bracket.east.filter((s) => s.round === 1)
    const activeSeries = eastR1.find((s) => s.status === 'in_progress')
    expect(activeSeries).toBeDefined()
  })
})

describe('simulateSeries', () => {
  it('returns empty for nonexistent series', async () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)
    league.playoffBracket = bracket

    const rng = new SeededRandom({ seed: 'test-seed', position: 0 })
    const results = await simulateSeries(league, 'nonexistent', rng)
    expect(results.length).toBe(0)
  })

  it('returns empty for completed series', async () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)
    league.playoffBracket = bracket

    const eastR1 = bracket.east.filter((s) => s.round === 1)
    const series = eastR1[0]!
    series.status = 'final'
    series.winnerTeamId = series.higherSeedTeamId

    const rng = new SeededRandom({ seed: 'test-seed', position: 0 })
    const results = await simulateSeries(league, series.id, rng)
    expect(results.length).toBe(0)
  })
})

describe('computeTeamSeasonResults', () => {
  it('assigns correct results for completed bracket', () => {
    const bracket = {
      seasonYear: 2026,
      format: 'top8' as const,
      east: [],
      west: [],
      finals: {
        id: 'finals-r4-1',
        conference: 'Finals' as const,
        round: 4 as const,
        higherSeedTeamId: 'east-1',
        lowerSeedTeamId: 'west-1',
        higherSeed: 1,
        lowerSeed: 1,
        seriesLength: 7 as const,
        higherSeedWins: 4,
        lowerSeedWins: 2,
        status: 'final' as const,
        games: [],
        winnerTeamId: 'east-1',
        isUpset: false,
        startDate: '2026-06-01',
      },
      status: 'complete' as const,
      championTeamId: 'east-1',
      runnerUpTeamId: 'west-1',
    }

    const results = computeTeamSeasonResults(bracket, ['east-1', 'west-1', 'east-2', 'west-2'])
    expect(results['east-1']).toBe('champion')
    expect(results['west-1']).toBe('finals_loss')
  })
})

describe('getPlayoffSeeds', () => {
  it('returns seeds from R1 series', () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    const seeds = getPlayoffSeeds(bracket, 'East')
    expect(seeds.length).toBeGreaterThanOrEqual(4)
    expect(seeds[0]!.seed).toBe(1)
  })
})

describe('isBracketComplete', () => {
  it('returns true when status is complete', () => {
    expect(isBracketComplete({ status: 'complete' } as any)).toBe(true)
    expect(isBracketComplete({ status: 'bracket' } as any)).toBe(false)
  })
})

describe('getSeriesById', () => {
  it('finds a series by ID', () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    const series = getSeriesById(bracket, 'east-r1-1')
    expect(series).toBeDefined()
    expect(series!.id).toBe('east-r1-1')
  })

  it('returns undefined for nonexistent ID', () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)

    expect(getSeriesById(bracket, 'nonexistent')).toBeUndefined()
  })
})

describe('full bracket simulation', () => {
  it('simulates entire bracket to champion', async () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)
    league.playoffBracket = bracket

    const rng = new SeededRandom({ seed: 'full-bracket-test', position: 0 })

    let iterations = 0
    while (bracket.status !== 'complete' && iterations < 200) {
      const result = await advancePlayoffSeries(league, rng)
      if (result.bracketComplete) break
      iterations++
    }

    expect(bracket.status).toBe('complete')
    expect(bracket.championTeamId).toBeDefined()
    expect(bracket.runnerUpTeamId).toBeDefined()
    expect(bracket.finals?.winnerTeamId).toBeDefined()
    expect(bracket.finals?.status).toBe('final')

    const eastCF = bracket.east.find((s) => s.round === 3)
    const westCF = bracket.west.find((s) => s.round === 3)
    expect(eastCF?.status).toBe('final')
    expect(westCF?.status).toBe('final')
    expect(eastCF?.winnerTeamId).toBeDefined()
    expect(westCF?.winnerTeamId).toBeDefined()

    const finalsTeams = [bracket.finals!.higherSeedTeamId, bracket.finals!.lowerSeedTeamId]
    expect(finalsTeams).toContain(eastCF!.winnerTeamId)
    expect(finalsTeams).toContain(westCF!.winnerTeamId)

    const required = Math.ceil(bracket.finals!.seriesLength / 2)
    const finalsWins = bracket.finals!.higherSeedWins + bracket.finals!.lowerSeedWins
    expect(finalsWins).toBeGreaterThanOrEqual(required)
  }, 30000)

  it('simulates play-in then bracket to champion', async () => {
    const league = makeLeague({ rules: { hasPlayIn: true, playoffFormat: 'playin_then_top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)
    league.playoffBracket = bracket

    expect(bracket.status).toBe('play_in')
    expect(bracket.playIn).toBeDefined()
    expect(bracket.playIn!.east.length).toBe(3)
    expect(bracket.playIn!.west.length).toBe(3)

    const rng = new SeededRandom({ seed: 'playin-e2e-test', position: 0 })

    let iterations = 0
    while (bracket.status !== 'complete' && iterations < 300) {
      const result = await advancePlayoffSeries(league, rng)
      if (result.bracketComplete) break
      iterations++
    }

    expect(bracket.status).toBe('complete')
    expect(bracket.championTeamId).toBeDefined()
    expect(bracket.playIn!.playInWinners).toBeDefined()
    expect(bracket.playIn!.playInWinners!.east7).toBeDefined()
    expect(bracket.playIn!.playInWinners!.east8).toBeDefined()
    expect(bracket.playIn!.playInWinners!.west7).toBeDefined()
    expect(bracket.playIn!.playInWinners!.west8).toBeDefined()

    const eastR1 = bracket.east.filter((s) => s.round === 1)
    const playInSeeds78 = eastR1.filter((s) => s.higherSeed === 7 || s.higherSeed === 8 || s.lowerSeed === 7 || s.lowerSeed === 8)
    for (const s of playInSeeds78) {
      expect(s.status).not.toBe('scheduled')
    }
  }, 30000)

  it('assigns missed_playoffs to non-playoff teams', async () => {
    const league = makeLeague({ rules: { hasPlayIn: false, playoffFormat: 'top8' } })
    const bracket = generatePlayoffBracket(league, league.rules)
    league.playoffBracket = bracket

    const rng = new SeededRandom({ seed: 'missed-test', position: 0 })

    let iterations = 0
    while (bracket.status !== 'complete' && iterations < 200) {
      const result = await advancePlayoffSeries(league, rng)
      if (result.bracketComplete) break
      iterations++
    }

    const allTeamIds = Object.keys(league.teams)
    const results = computeTeamSeasonResults(bracket, allTeamIds)

    const nonPlayoffTeams = allTeamIds.filter((id) => {
      const inBracket = bracket.east.some((s) => s.higherSeedTeamId === id || s.lowerSeedTeamId === id)
        || bracket.west.some((s) => s.higherSeedTeamId === id || s.lowerSeedTeamId === id)
      return !inBracket
    })

    for (const id of nonPlayoffTeams) {
      expect(results[id]).toBe('missed_playoffs')
    }

    expect(results[bracket.championTeamId!]).toBe('champion')
  }, 30000)
})
