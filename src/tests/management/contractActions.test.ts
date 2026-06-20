import { describe, it, expect } from 'vitest'
import {
  cutPlayer,
  stretchContract,
  buyoutPlayer,
  extendPlayer,
  signFreeAgent,
} from '@/game/management/contractActions'
import { emptyContract } from '@/game/models/contract'
import { getLeagueRules } from '@/game/models/leagueRules'
import type { Player } from '@/game/models/player'
import type { Team } from '@/game/models/team'
import type { TeamExceptionBook } from '@/game/models/team'

const rules = getLeagueRules('2025-26')

function makePlayer(
  overrides: Partial<Player> = {},
  contractOverrides?: Partial<ReturnType<typeof emptyContract>>,
): Player {
  const contract = {
    ...emptyContract(10_000_000, 2),
    ...contractOverrides,
  }
  return {
    id: 'player-1',
    firstName: 'Test',
    lastName: 'Player',
    age: 25,
    position: 'PG',
    secondaryPositions: [],
    heightInches: 75,
    weightLbs: 190,
    teamId: 'team-1',
    ratings: {} as any,
    tendencies: {} as any,
    traits: {} as any,
    contract,
    morale: { level: 50, happiness: 50, roleSatisfaction: 75, teamSatisfaction: 50, tradeRequest: false, tradeRequestLevel: 0 },
    health: { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0 },
    development: { lastTrainedAt: null, focusArea: null, recentForm: 50, ageAtPeak: 27, progressionCurve: 'normal', ratingsDelta: {}, breakoutChance: 0.1, bustRisk: 0.1 },
    seasonStats: {} as any,
    careerStats: [],
    historicalSeasons: [],
    ...overrides,
  }
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    city: 'Test',
    name: 'Team',
    abbreviation: 'TST',
    conference: 'East',
    division: 'Atlantic',
    colors: { primary: '#000', secondary: '#fff' },
    roster: ['player-1'],
    lineup: {
      starters: [],
      bench: [],
      closingLineup: [],
      targetMinutes: {},
      autoRotation: true,
    },
    strategy: { offense: {} as any, defense: {} as any },
    finances: {
      salaryCap: 140_588_000,
      apron: 178_132_000,
      secondApron: 189_502_000,
      luxuryTaxLine: 171_314_000,
      payroll: 10_000_000,
      capSpace: 130_588_000,
      taxBill: 0,
      projectedTaxBill: 0,
      baseRevenue: 0,
      localRevenue: 0,
      seasonPerformanceBonus: 0,
      totalRevenue: 0,
      operatingExpenses: 10_000_000,
      totalExpenses: 10_000_000,
      netIncome: 0,
      ownerCash: 50_000_000,
      cashReserves: 100_000_000,
      ownerPatience: 70,
      exceptionsUsed: {
        mle: false,
        bae: false,
        roomMle: false,
        minimumCount: 0,
      },
    },
    direction: 'middle',
    chemistry: 50,
    morale: 50,
    prestige: 75,
    ...overrides,
  }
}

function makeExceptions(overrides: Partial<TeamExceptionBook> = {}): TeamExceptionBook {
  return {
    mle: false,
    bae: false,
    roomMle: false,
    minimumCount: 0,
    ...overrides,
  }
}

describe('cutPlayer', () => {
  it('guaranteed portion becomes dead money', () => {
    const contract = emptyContract(10_000_000, 3)
    contract.guaranteedByYear = [true, true, false]
    contract.guaranteed = false // per-year control
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.roster = ['player-1']
    team.finances.payroll = 10_000_000

    const result = cutPlayer('player-1', player, team, { 'player-1': player }, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Dead money = guaranteed years salary = 10M + 10M = 20M
    const deadContract = result.patch.players['player-1']!.contract!
    expect(deadContract.salaryByYear[0]).toBe(20_000_000)
  })

  it('non-guaranteed salary is freed', () => {
    const contract = emptyContract(10_000_000, 3)
    contract.guaranteedByYear = [true, false, false]
    contract.guaranteed = false
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.roster = ['player-1']
    team.finances.payroll = 10_000_000

    const result = cutPlayer('player-1', player, team, { 'player-1': player }, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Dead money = only first year guaranteed = 10M
    // Freed = 10M - 10M = 0
    const deadContract = result.patch.players['player-1']!.contract!
    expect(deadContract.salaryByYear[0]).toBe(10_000_000)
  })

  it('player removed from roster and set to null teamId', () => {
    const player = makePlayer()
    const team = makeTeam()
    team.roster = ['player-1']

    const result = cutPlayer('player-1', player, team, { 'player-1': player }, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.patch.players['player-1']!.teamId).toBeNull()
    expect(result.patch.teams['team-1']!.roster).not.toContain('player-1')
  })

  it('rejects player not on the team', () => {
    const player = makePlayer({ teamId: 'team-2' })
    const team = makeTeam()

    const result = cutPlayer('player-1', player, team, {}, rules)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('not on this team')
  })

  it('updates payroll correctly', () => {
    const contract = emptyContract(20_000_000, 2)
    contract.guaranteedByYear = [true, false]
    contract.guaranteed = false
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.finances.payroll = 20_000_000

    const result = cutPlayer('player-1', player, team, { 'player-1': player }, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Dead = 20M, freed = 0, new payroll = 20M - 0 = 20M
    const teamPatch = result.patch.teams['team-1']!.finances!
    expect(teamPatch.payroll).toBe(20_000_000)
  })
})

describe('stretchContract', () => {
  it('$10M × 4 yrs → $5M/yr for 8 yrs (STRETCH_MULTIPLIER=2)', () => {
    const contract = emptyContract(10_000_000, 4)
    contract.guaranteedByYear = [true, true, true, true]
    contract.guaranteed = true
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.finances.payroll = 10_000_000

    const result = stretchContract('player-1', player, team, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const newContract = result.patch.players['player-1']!.contract!
    expect(newContract.yearsRemaining).toBe(8)
    expect(newContract.salaryByYear).toHaveLength(8)
    // 40M guaranteed / 8 years = 5M per year
    for (const salary of newContract.salaryByYear) {
      expect(salary).toBe(5_000_000)
    }
  })

  it('removes player from roster', () => {
    const contract = emptyContract(10_000_000, 2)
    contract.guaranteedByYear = [true, true]
    contract.guaranteed = true
    const player = makePlayer({}, contract)
    const team = makeTeam()

    const result = stretchContract('player-1', player, team, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.patch.players['player-1']!.teamId).toBeNull()
    expect(result.patch.teams['team-1']!.roster).not.toContain('player-1')
  })

  it('rejects player not on the team', () => {
    const player = makePlayer({ teamId: 'team-2' })
    const team = makeTeam()

    const result = stretchContract('player-1', player, team, rules)
    expect(result.ok).toBe(false)
  })
})

describe('buyoutPlayer', () => {
  it('settle < guaranteed: pays spread over BUYOUT_SETOFF_DIVISOR', () => {
    // Contract: 30M/yr for 2 yrs, both guaranteed = 60M guaranteed
    const contract = emptyContract(30_000_000, 2)
    contract.guaranteedByYear = [true, true]
    contract.guaranteed = true
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.finances.payroll = 30_000_000

    // Settle on $30M out of $60M guaranteed
    const result = buyoutPlayer('player-1', player, 30_000_000, team, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // capHitPost = (60M - 30M) / 2 = 15M
    const newContract = result.patch.players['player-1']!.contract!
    expect(newContract.salaryByYear[0]).toBe(15_000_000)
    expect(newContract.yearsRemaining).toBe(1)
  })

  it('settle >= guaranteed: player becomes free agent with cleared cap', () => {
    const contract = emptyContract(30_000_000, 2)
    contract.guaranteedByYear = [true, true]
    contract.guaranteed = true
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.finances.payroll = 30_000_000

    // Settle on full $60M guaranteed
    const result = buyoutPlayer('player-1', player, 60_000_000, team, rules)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.patch.players['player-1']!.teamId).toBeNull()
    const newContract = result.patch.players['player-1']!.contract!
    expect(newContract.salaryByYear[0]).toBe(0)
    expect(newContract.yearsRemaining).toBe(0)
    // Payroll cleared entirely
    const teamFinances = result.patch.teams['team-1']!.finances!
    expect(teamFinances.payroll).toBe(0)
  })

  it('rejects negative settle amount', () => {
    const player = makePlayer()
    const team = makeTeam()

    const result = buyoutPlayer('player-1', player, -1_000_000, team, rules)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('negative')
  })

  it('rejects settle exceeding guaranteed', () => {
    const contract = emptyContract(20_000_000, 2)
    contract.guaranteedByYear = [true, false]
    contract.guaranteed = false
    const player = makePlayer({}, contract)
    const team = makeTeam()

    // Guaranteed = 20M, settle at 25M
    const result = buyoutPlayer('player-1', player, 25_000_000, team, rules)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('exceed guaranteed')
  })

  it('rejects player not on the team', () => {
    const player = makePlayer({ teamId: 'team-2' })
    const team = makeTeam()

    const result = buyoutPlayer('player-1', player, 0, team, rules)
    expect(result.ok).toBe(false)
  })
})

describe('extendPlayer', () => {
  it('rejects extension exceeding maxContractYears', () => {
    const player = makePlayer()
    const team = makeTeam()

    const result = extendPlayer(
      'player-1',
      player,
      { years: 6, salaryByYear: Array(6).fill(20_000_000), option: 'none', noTradeClause: false },
      team,
      {},
      rules,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Maximum contract length')
  })

  it('rejects year/salary length mismatch', () => {
    const player = makePlayer()
    const team = makeTeam()

    const result = extendPlayer(
      'player-1',
      player,
      { years: 3, salaryByYear: [20_000_000, 20_000_000], option: 'none', noTradeClause: false },
      team,
      {},
      rules,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Years must match')
  })

  it('rejects > 8% annual raises', () => {
    const player = makePlayer()
    const team = makeTeam()

    const result = extendPlayer(
      'player-1',
      player,
      {
        years: 3,
        salaryByYear: [20_000_000, 25_000_000, 20_000_000],
        option: 'none',
        noTradeClause: false,
      },
      team,
      {},
      rules,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('8%')
  })

  it('rejects over-cap extension without bird rights', () => {
    const contract = emptyContract(10_000_000, 1)
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.finances.payroll = 140_000_000 // near cap

    const result = extendPlayer(
      'player-1',
      player,
      {
        years: 2,
        salaryByYear: [20_000_000, 20_000_000],
        option: 'none',
        noTradeClause: false,
      },
      team,
      {},
      rules,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('bird rights')
  })

  it('allows over-cap extension with bird rights', () => {
    const contract = emptyContract(10_000_000, 1)
    contract.birdRights = true
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.finances.payroll = 140_000_000

    const result = extendPlayer(
      'player-1',
      player,
      {
        years: 2,
        salaryByYear: [20_000_000, 20_000_000],
        option: 'none',
        noTradeClause: false,
      },
      team,
      {},
      rules,
    )
    expect(result.ok).toBe(true)
  })

  it('accepts valid extension within raises limit', () => {
    const contract = emptyContract(10_000_000, 1)
    const player = makePlayer({}, contract)
    const team = makeTeam()
    team.finances.payroll = 50_000_000

    // Year 0: 20M, Year 1: 20M × 1.08 = 21.6M, Year 2: 20M × 1.16 = 23.2M, Year 3: 20M × 1.24 = 24.8M
    const result = extendPlayer(
      'player-1',
      player,
      {
        years: 4,
        salaryByYear: [20_000_000, 21_600_000, 23_200_000, 24_800_000],
        option: 'none',
        noTradeClause: false,
      },
      team,
      {},
      rules,
    )
    expect(result.ok).toBe(true)
  })

  it('rejects player not on the team', () => {
    const player = makePlayer({ teamId: 'team-2' })
    const team = makeTeam()

    const result = extendPlayer(
      'player-1',
      player,
      { years: 2, salaryByYear: [20_000_000, 20_000_000], option: 'none', noTradeClause: false },
      team,
      {},
      rules,
    )
    expect(result.ok).toBe(false)
  })
})

describe('signFreeAgent', () => {
  it('MLE allowed over cap, once per offseason', () => {
    const player = makePlayer({ teamId: null })
    const team = makeTeam()
    team.finances.payroll = 150_000_000 // over cap

    const exceptions = makeExceptions()
    const result = signFreeAgent(
      'player-1',
      player,
      { years: 2, salaryByYear: [12_000_000, 12_000_000] },
      'mle',
      team,
      rules,
      exceptions,
    )
    expect(result.ok).toBe(true)
  })

  it('MLE rejected when already used', () => {
    const player = makePlayer({ teamId: null })
    const team = makeTeam()
    team.finances.payroll = 100_000_000

    const exceptions = makeExceptions({ mle: true })
    const result = signFreeAgent(
      'player-1',
      player,
      { years: 1, salaryByYear: [10_000_000] },
      'mle',
      team,
      rules,
      exceptions,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('already used')
  })

  it('MLE rejected when exceeds MLE amount', () => {
    const player = makePlayer({ teamId: null })
    const team = makeTeam()
    team.finances.payroll = 100_000_000

    const exceptions = makeExceptions()
    const result = signFreeAgent(
      'player-1',
      player,
      { years: 1, salaryByYear: [15_000_000] },
      'mle',
      team,
      rules,
      exceptions,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('exceeds MLE')
  })

  it('minimum exception always available', () => {
    const player = makePlayer({ teamId: null })
    const team = makeTeam()
    team.finances.payroll = 160_000_000 // over cap

    const exceptions = makeExceptions()
    const result = signFreeAgent(
      'player-1',
      player,
      { years: 1, salaryByYear: [2_000_000] },
      'minimum',
      team,
      rules,
      exceptions,
    )
    expect(result.ok).toBe(true)
  })

  it('minimum increments minimumCount', () => {
    const player = makePlayer({ teamId: null })
    const team = makeTeam()
    team.finances.payroll = 100_000_000

    const exceptions = makeExceptions({ minimumCount: 2 })
    const result = signFreeAgent(
      'player-1',
      player,
      { years: 1, salaryByYear: [2_000_000] },
      'minimum',
      team,
      rules,
      exceptions,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const newExceptions =
      result.patch.teams['team-1']!.finances!.exceptionsUsed!
    expect(newExceptions.minimumCount).toBe(3)
  })

  it('rejects player who is not a free agent', () => {
    const player = makePlayer({ teamId: 'team-1' }) // on a team
    const team = makeTeam()

    const result = signFreeAgent(
      'player-1',
      player,
      { years: 1, salaryByYear: [10_000_000] },
      'minimum',
      team,
      rules,
      makeExceptions(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('not a free agent')
  })

  it('rejects maxContractYears exceeded', () => {
    const player = makePlayer({ teamId: null })
    const team = makeTeam()

    const result = signFreeAgent(
      'player-1',
      player,
      { years: 6, salaryByYear: Array(6).fill(10_000_000) },
      'minimum',
      team,
      rules,
      makeExceptions(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Maximum contract length')
  })

  it('player added to roster with new contract', () => {
    const player = makePlayer({ teamId: null })
    const team = makeTeam()
    team.roster = []
    team.finances.payroll = 0

    const result = signFreeAgent(
      'player-1',
      player,
      { years: 2, salaryByYear: [10_000_000, 10_000_000] },
      'minimum',
      team,
      rules,
      makeExceptions(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.patch.players['player-1']!.teamId).toBe('team-1')
    expect(result.patch.teams['team-1']!.roster).toContain('player-1')
    expect(result.patch.teams['team-1']!.finances!.payroll).toBe(10_000_000)
  })
})
