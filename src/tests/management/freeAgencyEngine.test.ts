// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  identifyBirdRights,
  submitOffer,
  matchOfferSheet,
  RFA_MATCH_DAYS,
  generateCompensationPicks,
  identifyFreeAgents,
  identifyRestrictedFreeAgents,
  validateFreeAgentOffer,
  signPlayerFromOffer,
  expireContracts,
  resolveDailyBatches,
  yearsWithTeam,
  computeAskingSalary,
} from '@/game/management/freeAgencyEngine'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { addDays } from '@/lib/utils'
import { createContract } from '@/game/models/contract'
import { SeededRandom } from '@/game/sim/rng'

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

describe('identifyFreeAgents', () => {
  it('returns players with null teamId and no years remaining', () => {
    const team = makeTeam({ id: 't1' })
    const fa = makePlayer({ id: 'fa1', teamId: null, contract: createContract({ salaryByYear: [5_000_000], yearsRemaining: 0 }) })
    const rostered = makePlayer({ id: 'r1', teamId: 't1', contract: createContract({ salaryByYear: [5_000_000], yearsRemaining: 1 }) })
    const league = makeLeague(fa, team)
    league.players[rostered.id] = rostered
    const result = identifyFreeAgents(league)
    expect(result).toContain('fa1')
    expect(result).not.toContain('r1')
  })
})

describe('identifyRestrictedFreeAgents', () => {
  it('returns only players with qualifying offers', () => {
    const team = makeTeam({ id: 't1' })
    const rfa = makePlayer({ id: 'rfa1', teamId: null, contract: createContract({ salaryByYear: [5_000_000], yearsRemaining: 0 }) })
    const fa = makePlayer({ id: 'fa1', teamId: null, contract: createContract({ salaryByYear: [5_000_000], yearsRemaining: 0 }) })
    const league = makeLeague(rfa, team)
    league.players[fa.id] = fa
    league.qualifyingOffers = [{ id: 'qo1', playerId: 'rfa1', teamId: 't1', amount: 5_500_000, years: 1, expiresAt: '2026-07-15' }]
    const result = identifyRestrictedFreeAgents(league, league.qualifyingOffers)
    expect(result).toContain('rfa1')
    expect(result).not.toContain('fa1')
  })
})

describe('yearsWithTeam', () => {
  it('counts seasons played for a team', () => {
    const player = makePlayer({
      careerStats: [
        { season: '2024-25', teamId: 't1', gamesPlayed: 82, minutes: 2000, points: 1000, rebounds: 300, assists: 200, steals: 50, blocks: 30, turnovers: 100, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
        { season: '2023-24', teamId: 't1', gamesPlayed: 82, minutes: 2000, points: 900, rebounds: 280, assists: 180, steals: 45, blocks: 25, turnovers: 90, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
        { season: '2022-23', teamId: 't2', gamesPlayed: 82, minutes: 1800, points: 800, rebounds: 250, assists: 150, steals: 40, blocks: 20, turnovers: 80, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
      ],
    })
    expect(yearsWithTeam(player, 't1')).toBe(2)
    expect(yearsWithTeam(player, 't2')).toBe(1)
    expect(yearsWithTeam(player, 't3')).toBe(0)
  })
})

describe('validateFreeAgentOffer', () => {
  it('rejects when roster is full', () => {
    const team = makeTeam({ id: 't1' })
    team.roster = Array.from({ length: 20 }, (_, i) => `p${i}`)
    const player = makePlayer({ id: 'fa1', teamId: null })
    const league = makeLeague(player, team)
    const result = validateFreeAgentOffer(league, 't1', 'fa1', { years: 1, salaryByYear: [5_000_000] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Roster full')
  })

  it('rejects when player is not a free agent', () => {
    const team = makeTeam({ id: 't1' })
    const player = makePlayer({ id: 'p1', teamId: 't1' })
    const league = makeLeague(player, team)
    const result = validateFreeAgentOffer(league, 't1', 'p1', { years: 1, salaryByYear: [5_000_000] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('not a free agent')
  })

  it('rejects when insufficient cap space', () => {
    const team = makeTeam({ id: 't1' })
    team.finances.capSpace = 1_000_000
    const player = makePlayer({ id: 'fa1', teamId: null })
    const league = makeLeague(player, team)
    const result = validateFreeAgentOffer(league, 't1', 'fa1', { years: 1, salaryByYear: [5_000_000] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('cap space')
  })

  it('accepts valid offer', () => {
    const team = makeTeam({ id: 't1' })
    team.finances.capSpace = 100_000_000
    const player = makePlayer({ id: 'fa1', teamId: null })
    const league = makeLeague(player, team)
    const result = validateFreeAgentOffer(league, 't1', 'fa1', { years: 1, salaryByYear: [5_000_000] })
    expect(result.ok).toBe(true)
  })
})

describe('signPlayerFromOffer', () => {
  it('assigns player to team and updates payroll', () => {
    const team = makeTeam({ id: 't1' })
    team.finances.payroll = 50_000_000
    team.finances.capSpace = 90_000_000
    const player = makePlayer({ id: 'fa1', teamId: null })
    const league = makeLeague(player, team)
    const offer = submitOffer({ years: 2, salaryByYear: [10_000_000, 10_000_000] }, 'fa1', 't1', player, '2026-07-01', false)
    signPlayerFromOffer(league, offer, player)
    expect(player.teamId).toBe('t1')
    expect(team.roster).toContain('fa1')
    expect(team.finances.payroll).toBe(60_000_000)
    expect(offer.status).toBe('accepted')
  })
})

describe('expireContracts', () => {
  it('removes players with expired contracts from rosters', () => {
    const team = makeTeam({ id: 't1', roster: ['p1', 'p2'] })
    const p1 = makePlayer({ id: 'p1', teamId: 't1', contract: createContract({ salaryByYear: [5_000_000], yearsRemaining: 0 }) })
    const p2 = makePlayer({ id: 'p2', teamId: 't1', contract: createContract({ salaryByYear: [5_000_000], yearsRemaining: 1 }) })
    const league = makeLeague(p1, team)
    league.players.p2 = p2
    const expired = expireContracts(league)
    expect(expired).toContain('p1')
    expect(expired).not.toContain('p2')
    expect(p1.teamId).toBeNull()
    expect(team.roster).not.toContain('p1')
    expect(team.roster).toContain('p2')
  })
})

describe('computeAskingSalary', () => {
  it('returns salary based on overall rating', () => {
    const player = makePlayer({ ratings: { overall: 80 } as never })
    const salary = computeAskingSalary(player, { salaryCap: 140_000_000 })
    expect(salary).toBeGreaterThan(0)
    expect(salary).toBeLessThan(140_000_000)
  })

  it('returns minimum salary for very low overall', () => {
    const player = makePlayer({ ratings: { overall: 40 } as never })
    const salary = computeAskingSalary(player, { salaryCap: 140_000_000 })
    expect(salary).toBeGreaterThanOrEqual(140_000_000 * 0.02)
  })
})

describe('resolveDailyBatches', () => {
  it('resolves pending offers and signs best player', () => {
    const team = makeTeam({ id: 't1' })
    team.finances.capSpace = 100_000_000
    const team2 = makeTeam({ id: 't2' })
    team2.finances.capSpace = 100_000_000
    const player = makePlayer({ id: 'fa1', teamId: null, ratings: { overall: 80 } as never })
    const league = makeLeague(player, team)
    league.teams.t2 = team2

    const offer1 = submitOffer({ years: 1, salaryByYear: [10_000_000] }, 'fa1', 't1', player, '2026-07-01', false)
    const offer2 = submitOffer({ years: 1, salaryByYear: [15_000_000] }, 'fa1', 't2', player, '2026-07-01', false)
    league.freeAgentOffers = [offer1, offer2]

    const result = resolveDailyBatches(league, '2026-07-05')
    expect(result.resolvedOffers.length).toBeGreaterThan(0)
    const accepted = result.resolvedOffers.find((o) => o.status === 'accepted')
    expect(accepted).toBeDefined()
    expect(player.teamId).not.toBeNull()
  })
})
