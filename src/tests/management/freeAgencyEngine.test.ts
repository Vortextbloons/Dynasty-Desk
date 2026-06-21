// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  identifyBirdRights,
  submitOffer,
  matchOfferSheet,
  RFA_MATCH_DAYS,
  generateCompensationPicks,
} from '@/game/management/freeAgencyEngine'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { addDays } from '@/lib/utils'

function makeLeague(player: ReturnType<typeof makePlayer>, team: ReturnType<typeof makeTeam>): LeagueState {
  return {
    id: 'l',
    name: 'L',
    currentDate: '2026-07-01',
    seasonYear: 2026,
    phase: 'free_agency',
    rules: DEFAULT_LEAGUE_RULES,
    eraConfig: { season: '2025-26', pace: 100, league3PARate: 0.35, leagueTsPct: 0.57, leaguePpg: 112, possessionCoefficient: 1 },
    snapshotId: 's',
    teams: { [team.id]: team },
    players: { [player.id]: player },
    games: {},
    standings: {},
    scheduleGenerated: false,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    drafts: {},
    scoutingState: {},
    freeAgentOffers: [],
    qualifyingOffers: [],
    compensationPicks: [],
    offseasonLog: [],
    rosterSizeCap: 20,
    champions: [],
    awards: [],
    activeProposals: [],
    rivalries: {},
    records: [],
    hallOfFame: [],
    userTeamId: team.id,
  }
}

describe('freeAgencyEngine', () => {
  it('bird rights strictly current team', () => {
    const team = makeTeam({ id: 'home' })
    const player = makePlayer({
      teamId: null,
      careerStats: [
        { season: '2024-25', teamId: 'home', gamesPlayed: 82, minutes: 2000, points: 1000, rebounds: 300, assists: 200, steals: 50, blocks: 30, turnovers: 100, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
        { season: '2023-24', teamId: 'home', gamesPlayed: 82, minutes: 2000, points: 900, rebounds: 280, assists: 180, steals: 45, blocks: 25, turnovers: 90, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
        { season: '2022-23', teamId: 'home', gamesPlayed: 82, minutes: 1800, points: 800, rebounds: 250, assists: 150, steals: 40, blocks: 20, turnovers: 80, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
        { season: '2021-22', teamId: 'home', gamesPlayed: 82, minutes: 1600, points: 700, rebounds: 200, assists: 120, steals: 35, blocks: 15, turnovers: 70, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
      ],
    })
    const league = makeLeague(player, team)
    expect(identifyBirdRights(league, player, 'home')).toBe('bird')
    const onOther = makePlayer({ teamId: 'other' })
    expect(identifyBirdRights(league, onOther, 'home')).toBe('non_bird')
  })

  it('RFA 7-day match window', () => {
    const team = makeTeam()
    const player = makePlayer({ teamId: null })
    const offer = submitOffer(
      { years: 2, salaryByYear: [10_000_000, 10_000_000] },
      player.id,
      'other-team',
      player,
      '2026-07-01',
      true,
    )
    expect(offer.matchDeadline).toBe(addDays('2026-07-01', RFA_MATCH_DAYS))
    const match = matchOfferSheet(offer, team, team.id, '2026-07-05', player)
    expect(match.matched).toBe(true)
    const late = matchOfferSheet(offer, team, team.id, addDays('2026-07-01', 8), player)
    expect(late.matched).toBe(false)
  })

  it('comp pick standard / high_value thresholds', () => {
    const standard = generateCompensationPicks(
      { seasonYear: 2026 } as LeagueState,
      [{ playerId: 'p1', teamId: 't1', salary: 10_000_000 }],
      2026,
    )
    expect(standard).toHaveLength(1)
    expect(standard[0]?.threshold).toBe('standard')

    const high = generateCompensationPicks(
      { seasonYear: 2026 } as LeagueState,
      [{ playerId: 'p2', teamId: 't1', salary: 20_000_000 }],
      2026,
    )
    expect(high).toHaveLength(2)
    expect(high[0]?.threshold).toBe('high_value')
  })
})
