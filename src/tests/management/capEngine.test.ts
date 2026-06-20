import { describe, it, expect } from 'vitest'
import {
  computeCapHit,
  computePayroll,
  computeCapSpace,
  computeApronStatus,
  computeTaxBill,
  computeProjectedTaxBill,
} from '@/game/management/capEngine'
import { emptyContract } from '@/game/models/contract'
import { getLeagueRules } from '@/game/models/leagueRules'
import type { Player } from '@/game/models/player'
import type { Team } from '@/game/models/team'

function makePlayer(contract: Player['contract']): Player {
  return {
    id: 'test',
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
  }
}

function makeTeam(payroll: number): Team {
  return {
    id: 'team-1',
    city: 'Test',
    name: 'Team',
    abbreviation: 'TST',
    conference: 'East',
    division: 'Atlantic',
    colors: { primary: '#000', secondary: '#fff' },
    roster: [],
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
      payroll,
      capSpace: 140_588_000 - payroll,
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
  }
}

const rules = getLeagueRules('2025-26')

describe('computeCapHit', () => {
  it('returns base salary when no bonuses or kickers', () => {
    const contract = emptyContract(40_000_000, 2)
    const player = makePlayer(contract)
    expect(computeCapHit(player, rules)).toBe(40_000_000)
  })

  it('includes signing bonus in cap hit', () => {
    const contract = emptyContract(40_000_000, 3)
    contract.signingBonusByYear = [5_000_000, 0, 0]
    const player = makePlayer(contract)
    expect(computeCapHit(player, rules)).toBe(45_000_000)
  })

  it('includes likely bonuses in cap hit', () => {
    const contract = emptyContract(30_000_000, 2)
    contract.likelyBonusesByYear = [3_000_000, 2_000_000]
    const player = makePlayer(contract)
    expect(computeCapHit(player, rules)).toBe(33_000_000)
  })

  it('includes on_roster_date trade kicker', () => {
    const contract = emptyContract(40_000_000, 2)
    contract.tradeKickers = [
      { condition: 'on_roster_date', threshold: 0, amount: 2_000_000 },
    ]
    const player = makePlayer(contract)
    expect(computeCapHit(player, rules)).toBe(42_000_000)
  })

  it('excludes minutes_threshold trade kicker', () => {
    const contract = emptyContract(40_000_000, 2)
    contract.tradeKickers = [
      { condition: 'minutes_threshold', threshold: 1000, amount: 3_000_000 },
    ]
    const player = makePlayer(contract)
    expect(computeCapHit(player, rules)).toBe(40_000_000)
  })

  it('excludes games_played trade kicker', () => {
    const contract = emptyContract(40_000_000, 2)
    contract.tradeKickers = [
      { condition: 'games_played', threshold: 50, amount: 1_000_000 },
    ]
    const player = makePlayer(contract)
    expect(computeCapHit(player, rules)).toBe(40_000_000)
  })

  it('reads year-specific salary', () => {
    const contract = emptyContract(0, 3)
    contract.salaryByYear = [30_000_000, 35_000_000, 40_000_000]
    const player = makePlayer(contract)
    expect(computeCapHit(player, rules, 0)).toBe(30_000_000)
    expect(computeCapHit(player, rules, 1)).toBe(35_000_000)
    expect(computeCapHit(player, rules, 2)).toBe(40_000_000)
  })

  it('includes poison pill salary when active', () => {
    const contract = emptyContract(10_000_000, 3)
    contract.salaryByYear = [10_000_000, 20_000_000, 30_000_000]
    contract.poisonPill = true
    const player = makePlayer(contract)

    expect(computeCapHit(player, rules, 0)).toBe(35_000_000)
    expect(computeCapHit(player, rules, 1)).toBe(35_000_000)
  })
})

describe('computePayroll', () => {
  it('sums cap hits across roster', () => {
    const p1 = makePlayer(emptyContract(20_000_000, 2))
    p1.id = 'p1'
    const p2 = makePlayer(emptyContract(15_000_000, 3))
    p2.id = 'p2'

    const team = makeTeam(0)
    team.roster = ['p1', 'p2']

    const players = { p1, p2 }
    expect(computePayroll(team, players, rules)).toBe(35_000_000)
  })

  it('skips missing players in roster', () => {
    const p1 = makePlayer(emptyContract(10_000_000, 2))
    p1.id = 'p1'

    const team = makeTeam(0)
    team.roster = ['p1', 'missing-player']

    const players = { p1 }
    expect(computePayroll(team, players, rules)).toBe(10_000_000)
  })

  it('returns 0 for empty roster', () => {
    const team = makeTeam(0)
    team.roster = []
    expect(computePayroll(team, {}, rules)).toBe(0)
  })
})

describe('computeCapSpace', () => {
  it('returns positive space when payroll is below cap', () => {
    const team = makeTeam(100_000_000)
    expect(computeCapSpace(team, rules)).toBe(40_588_000)
  })

  it('returns 0 when payroll equals cap', () => {
    const team = makeTeam(140_588_000)
    expect(computeCapSpace(team, rules)).toBe(0)
  })

  it('returns negative space when payroll exceeds cap', () => {
    const team = makeTeam(160_000_000)
    expect(computeCapSpace(team, rules)).toBe(-19_412_000)
  })
})

describe('computeApronStatus', () => {
  it('returns below when payroll is under apron', () => {
    const team = makeTeam(150_000_000)
    expect(computeApronStatus(team, rules)).toBe('below')
  })

  it('returns first when payroll is at first apron', () => {
    const team = makeTeam(178_132_000)
    expect(computeApronStatus(team, rules)).toBe('first')
  })

  it('returns first when payroll is between aprons', () => {
    const team = makeTeam(180_000_000)
    expect(computeApronStatus(team, rules)).toBe('first')
  })

  it('returns second when payroll is at second apron', () => {
    const team = makeTeam(189_502_000)
    expect(computeApronStatus(team, rules)).toBe('second')
  })

  it('returns second when payroll exceeds second apron', () => {
    const team = makeTeam(200_000_000)
    expect(computeApronStatus(team, rules)).toBe('second')
  })
})

describe('computeTaxBill', () => {
  it('returns 0 when payroll is below luxury tax line', () => {
    const team = makeTeam(150_000_000)
    expect(computeTaxBill(team, rules, 0)).toBe(0)
  })

  it('computes correct tax for non-repeater', () => {
    // excess = 200M - 171.314M = 28,686,000
    // Bracket 0: 5M × 1.5 = 7,500,000
    // Bracket 1: 5M × 1.75 = 8,750,000
    // Bracket 2: 5M × 2.25 = 11,250,000
    // Bracket 3: 5M × 2.75 = 13,750,000
    // Bracket 4: 5M × 3.25 = 16,250,000
    // Bracket 5: 3,686,000 × 3.75 = 13,822,500
    // Total = 71,322,500
    const team = makeTeam(200_000_000)
    const tax = computeTaxBill(team, rules, 0)
    expect(tax).toBe(71_322_500)
  })

  it('computes higher tax for repeater (3+ prior years)', () => {
    // Same excess = 28,686,000 but with repeater rates
    // Bracket 0: 5M × 2.5 = 12,500,000
    // Bracket 1: 5M × 2.75 = 13,750,000
    // Bracket 2: 5M × 3.5 = 17,500,000
    // Bracket 3: 5M × 4.25 = 21,250,000
    // Bracket 4: 5M × 5.0 = 25,000,000
    // Bracket 5: 3,686,000 × 5.75 = 21,194,500
    // Total = 111,194,500
    const team = makeTeam(200_000_000)
    const tax = computeTaxBill(team, rules, 3)
    expect(tax).toBe(111_194_500)
  })

  it('returns 0 when payroll is exactly at tax line', () => {
    const team = makeTeam(171_314_000)
    expect(computeTaxBill(team, rules, 0)).toBe(0)
  })

  it('taxes only first bracket for small excess', () => {
    // excess = 176M - 171.314M = 4,686,000
    // All in bracket 1: 4,686,000 × 1.5 = 7,029,000
    const team = makeTeam(176_000_000)
    const tax = computeTaxBill(team, rules, 0)
    expect(tax).toBe(7_029_000)
  })

  it('computeProjectedTaxBill delegates to computeTaxBill', () => {
    const team = makeTeam(200_000_000)
    expect(computeProjectedTaxBill(team, rules, 0)).toBe(computeTaxBill(team, rules, 0))
  })

  it('handles exact 5M tax bracket boundary', () => {
    const team = makeTeam(176_314_000)
    const tax = computeTaxBill(team, rules, 0)
    expect(tax).toBe(7_500_000)
  })
})
