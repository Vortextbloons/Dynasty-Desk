import { describe, it, expect } from 'vitest'
import { transitionToOffseason } from '@/game/league/offseasonTransition'
import { makeTeam, makeRoster } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import type { PlayoffBracket } from '@/game/models/playoff'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'

function makeTestLeague(): LeagueState {
  const teams: Record<string, ReturnType<typeof makeTeam>> = {}
  const players: Record<string, any> = {}

  const t1 = makeTeam({ id: 'champ', city: 'Boston', name: 'Celtics', abbreviation: 'BOS', conference: 'East' })
  const t2 = makeTeam({ id: 'runner', city: 'Oklahoma City', name: 'Thunder', abbreviation: 'OKC', conference: 'West' })
  teams[t1.id] = t1
  teams[t2.id] = t2

  for (const t of [t1, t2]) {
    const roster = makeRoster(t.id, 15)
    for (const p of roster) {
      if (p.id === 'champ-p-1') {
        p.seasonStats = {
          ...p.seasonStats,
          gamesPlayed: 82,
          minutes: 2800,
          points: 2200,
          rebounds: 500,
          assists: 400,
          steals: 90,
          blocks: 45,
          fieldGoalsMade: 750,
          fieldGoalsAttempted: 1400,
          threePointersMade: 220,
          threePointersAttempted: 550,
          freeThrowsMade: 480,
          freeThrowsAttempted: 550,
        }
      }
      players[p.id] = p
      t.roster.push(p.id)
    }
  }

  const bracket: PlayoffBracket = {
    seasonYear: 2026,
    format: 'top8',
    east: [],
    west: [],
    finals: {
      id: 'finals-r4-1',
      conference: 'Finals',
      round: 4,
      higherSeedTeamId: 'champ',
      lowerSeedTeamId: 'runner',
      higherSeed: 1,
      lowerSeed: 1,
      seriesLength: 7,
      higherSeedWins: 4,
      lowerSeedWins: 2,
      status: 'final',
      games: [],
      winnerTeamId: 'champ',
      isUpset: false,
      startDate: '2026-06-01',
    },
    status: 'complete',
    championTeamId: 'champ',
    runnerUpTeamId: 'runner',
    finalsMvpPlayerId: 'champ-p-1',
  }

  return {
    id: 'test',
    name: 'Test',
    currentDate: '2026-06-20',
    seasonYear: 2026,
    phase: 'playoffs',
    rules: DEFAULT_LEAGUE_RULES,
    eraConfig: { season: '2025-26', pace: 100, league3PARate: 0.35, leagueTsPct: 0.57, leaguePpg: 112, possessionCoefficient: 1.0 },
    snapshotId: 'test',
    teams,
    players,
    games: {},
    standings: {},
    scheduleGenerated: true,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    champions: [],
    awards: [],
    activeProposals: [],
    userTeamId: 'champ',
    playoffBracket: bracket,
  } as unknown as LeagueState
}

describe('transitionToOffseason', () => {
  it('sets phase to offseason', () => {
    const league = makeTestLeague()
    transitionToOffseason(league)
    expect(league.phase).toBe('offseason')
  })

  it('stores champion in league.champions', () => {
    const league = makeTestLeague()
    transitionToOffseason(league)
    expect(league.champions.length).toBe(1)
    expect(league.champions[0]!.championTeamId).toBe('champ')
    expect(league.champions[0]!.runnerUpTeamId).toBe('runner')
    expect(league.champions[0]!.finalsMvpPlayerId).toBe('champ-p-1')
  })

  it('awards Finals MVP to awardsHistory', () => {
    const league = makeTestLeague()
    transitionToOffseason(league)
    expect(league.awardsHistory.length).toBe(1)
    const finalsMvp = league.awardsHistory[0]!.awards.find((a) => a.award === 'finals_mvp')
    expect(finalsMvp).toBeDefined()
    expect(finalsMvp!.playerId).toBe('champ-p-1')
    expect(finalsMvp!.teamId).toBe('champ')
  })

  it('fires championship news event', () => {
    const league = makeTestLeague()
    transitionToOffseason(league)
    const champNews = league.news.find((n) => n.type === 'championship')
    expect(champNews).toBeDefined()
    expect(champNews!.headline).toContain('Celtics')
  })

  it('fires Finals MVP news event', () => {
    const league = makeTestLeague()
    transitionToOffseason(league)
    const mvpNews = league.news.find((n) => n.type === 'finals_mvp')
    expect(mvpNews).toBeDefined()
  })

  it('fires offseason begins news event', () => {
    const league = makeTestLeague()
    transitionToOffseason(league)
    const offNews = league.news.find((n) => n.type === 'offseason_begins')
    expect(offNews).toBeDefined()
  })

  it('computes season awards after playoffs', () => {
    const league = makeTestLeague()
    transitionToOffseason(league)
    const mvp = league.awardsHistory[0]?.awards.find((a) => a.award === 'mvp')
    expect(mvp).toBeDefined()
  })

  it('still computes season awards without a complete bracket', () => {
    const league = makeTestLeague()
    league.playoffBracket = {
      seasonYear: 2026,
      format: 'top8',
      east: [],
      west: [],
      status: 'bracket',
    }
    transitionToOffseason(league)
    expect(league.phase).toBe('offseason')
    expect(league.awardsHistory.length).toBeGreaterThan(0)
    expect(league.news.some((n) => n.type === 'offseason_begins')).toBe(true)
  })
})
