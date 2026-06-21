// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  runLeagueEndOfSeasonDevelopment,
  runLeagueSeasonAwards,
} from '@/game/league/seasonWrapUp'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { SeededRandom } from '@/game/sim/rng'
import { computeOverall, OVERALL_WEIGHTS } from '@/game/ratings/overallWeights'

function makeMiniLeague(): LeagueState {
  const team = makeTeam({ id: 't1' })
  const star = makePlayer({
      id: 'star',
      teamId: team.id,
      seasonStats: {
        season: '2025-26',
        teamId: team.id,
        gamesPlayed: 82,
        minutes: 2800,
        points: 2000,
        rebounds: 400,
        assists: 300,
        steals: 80,
        blocks: 40,
        turnovers: 200,
        fieldGoalsMade: 700,
        fieldGoalsAttempted: 1400,
        threePointersMade: 200,
        threePointersAttempted: 500,
        freeThrowsMade: 400,
        freeThrowsAttempted: 480,
        plusMinus: 120,
      },
    })
  team.roster = [star.id]
  return {
    id: 'l1',
    name: 'Test',
    currentDate: '2026-06-01',
    seasonYear: 2026,
    phase: 'playoffs',
    rules: DEFAULT_LEAGUE_RULES,
    eraConfig: {} as LeagueState['eraConfig'],
    snapshotId: 'test',
    teams: { [team.id]: team },
    players: { [star.id]: star },
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
    userTeamId: team.id,
    awardRaces: {},
  } as unknown as LeagueState
}

describe('seasonWrapUp', () => {
  it('applies development deltas league-wide', () => {
    const league = makeMiniLeague()
    const player = league.players.star!
    const before = player.ratings.overall
    runLeagueEndOfSeasonDevelopment(league, new SeededRandom({ seed: 'dev-seed', position: 0 }))
    expect(player.development.ratingsDelta).toBeDefined()
    expect(player.ratings.overall).toBeDefined()
    expect(typeof before).toBe('number')
  })

  it('computes season awards and news for major winners', () => {
    const league = makeMiniLeague()
    const news = runLeagueSeasonAwards(league)
    expect(league.awardsHistory.length).toBe(1)
    expect(league.awardsHistory[0]!.awards.some((a) => a.award === 'mvp')).toBe(true)
    expect(news.some((n) => n.type === 'award_race')).toBe(true)
  })

  it('preserves finals mvp when season awards run', () => {
    const league = makeMiniLeague()
    league.awardsHistory.push({
      season: league.rules.seasonLabel,
      awards: [{
        season: league.rules.seasonLabel,
        award: 'finals_mvp',
        playerId: 'star',
        teamId: 't1',
      }],
      champions: [],
    })
    runLeagueSeasonAwards(league)
    expect(
      league.awardsHistory[0]!.awards.some((a) => a.award === 'finals_mvp'),
    ).toBe(true)
  })

  it('development produces a reasonable overall consistent with individual ratings', () => {
    const league = makeMiniLeague()
    const player = league.players.star!
    const beforeOverall = player.ratings.overall

    runLeagueEndOfSeasonDevelopment(league, new SeededRandom({ seed: 'prod-boost-seed', position: 0 }))

    const afterOverall = player.ratings.overall
    const delta = afterOverall - beforeOverall
    expect(delta).toBeGreaterThanOrEqual(-3)
    expect(delta).toBeLessThanOrEqual(5)
    const skillOverall = computeOverall(player.ratings, player.position)
    expect(Math.abs(afterOverall - skillOverall)).toBeLessThanOrEqual(2)
  })
})
