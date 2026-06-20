import { describe, it, expect } from 'vitest'
import {
  computeBaseRevenue,
  computeLocalRevenue,
  computeSeasonPerformanceBonus,
  computeTotalRevenue,
} from '@/game/management/revenueEngine'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { TeamFinances } from '@/game/models/team'

function makeRules(overrides?: Partial<LeagueRules>): LeagueRules {
  return {
    seasonLabel: '2025-26',
    teamCount: 30,
    regularSeasonGames: 82,
    playoffTeamsPerConference: 8,
    playoffSeriesLength: 7,
    salaryCapEnabled: true,
    salaryCap: 140_588_000,
    luxuryTaxEnabled: true,
    maxRosterSize: 15,
    minRosterSize: 13,
    maxContractYears: 5,
    draftRounds: 2,
    threePointLineDistance: 23.75,
    playoffFormat: 'playin_then_top8',
    hasPlayIn: true,
    apron: 178_132_000,
    secondApron: 189_502_000,
    luxuryTaxLine: 171_314_000,
    luxuryTaxRates: { nonTaxpayer: 1.5, taxpayer: 1.75, repeater: 2.5 },
    secondApronTaxRate: 3.75,
    apronPenaltyPerMillion: 1_000_000,
    midLevelException: 12_800_000,
    biAnnualException: 4_600_000,
    roomMle: 7_700_000,
    minimumPlayerSalary: 1_100_000,
    minimumTeamSalary: 126_529_200,
    tradeExceptionYears: 1,
    allowCashInTrades: true,
    twoWaySlots: 2,
    rookieScale: 'real',
    rookieDealYears: 4,
    rookieOptionYears: 2,
    ...overrides,
  }
}

describe('computeBaseRevenue', () => {
  it('scales with salary cap (cap / 0.45), rounded to nearest million', () => {
    const rules = makeRules({ salaryCap: 140_588_000 })
    // BRI = 140_588_000 / 0.45 = 312,417,777.78
    // Rounded to nearest million = 312,000,000
    expect(computeBaseRevenue(rules)).toBe(312_000_000)
  })

  it('rounds to nearest million', () => {
    // 135_000_000 / 0.45 = 300,000,000 exactly
    const rules = makeRules({ salaryCap: 135_000_000 })
    expect(computeBaseRevenue(rules)).toBe(300_000_000)
  })

  it('rounds up when fractional million is >= 0.5', () => {
    // 135_400_000 / 0.45 = 300,888,888.89 → 301,000,000
    const rules = makeRules({ salaryCap: 135_400_000 })
    expect(computeBaseRevenue(rules)).toBe(301_000_000)
  })
})

describe('computeLocalRevenue', () => {
  it('scales with market size and prestige', () => {
    // Large market (100), high prestige (100), .500 record
    // attendanceFactor = 0.7 + 0.05 * (0.5 - 0.5) * 100 = 0.7
    const result = computeLocalRevenue(
      { marketSize: 100, prestige: 100 },
      41,
      82,
    )
    // 2_000_000 * 100 * (100/100) * 0.7 = 140,000,000
    expect(result).toBe(140_000_000)
  })

  it('attendance factor scales with win percentage', () => {
    // Perfect record: 82/82 = 1.0 win pct
    // attendanceFactor = 0.7 + 0.05 * (1.0 - 0.5) * 100 = 0.7 + 2.5 = 3.2
    // clamped to ATTENDANCE_FACTOR_MAX = 1.1
    const result = computeLocalRevenue(
      { marketSize: 100, prestige: 100 },
      82,
      82,
    )
    // 2_000_000 * 100 * 1.0 * 1.1 = 220,000,000
    expect(result).toBe(220_000_000)
  })

  it('minimum attendance factor for winless team', () => {
    // 0/82 = 0.0 win pct
    // attendanceFactor = 0.7 + 0.05 * (0.0 - 0.5) * 100 = 0.7 - 2.5 = -1.8
    // clamped to ATTENDANCE_FACTOR_MIN = 0.7
    const result = computeLocalRevenue(
      { marketSize: 100, prestige: 100 },
      0,
      82,
    )
    // 2_000_000 * 100 * 1.0 * 0.7 = 140,000,000
    expect(result).toBe(140_000_000)
  })

  it('small market team earns less than large market', () => {
    const large = computeLocalRevenue(
      { marketSize: 95, prestige: 80 },
      41,
      82,
    )
    const small = computeLocalRevenue(
      { marketSize: 60, prestige: 80 },
      41,
      82,
    )
    expect(small).toBeLessThan(large)
  })
})

describe('computeSeasonPerformanceBonus', () => {
  it('returns 0 for missed_playoffs', () => {
    expect(computeSeasonPerformanceBonus('missed_playoffs')).toBe(0)
  })

  it('returns 5M for first_round_loss', () => {
    expect(computeSeasonPerformanceBonus('first_round_loss')).toBe(5_000_000)
  })

  it('returns 10M for second_round_loss', () => {
    expect(computeSeasonPerformanceBonus('second_round_loss')).toBe(10_000_000)
  })

  it('returns 15M for conference_finals_loss', () => {
    expect(computeSeasonPerformanceBonus('conference_finals_loss')).toBe(15_000_000)
  })

  it('returns 25M for finals_loss', () => {
    expect(computeSeasonPerformanceBonus('finals_loss')).toBe(25_000_000)
  })

  it('returns 40M for champion', () => {
    expect(computeSeasonPerformanceBonus('champion')).toBe(40_000_000)
  })
})

describe('computeTotalRevenue', () => {
  it('sums base, local, and performance bonus', () => {
    const finances: TeamFinances = {
      salaryCap: 0,
      apron: 0,
      secondApron: 0,
      luxuryTaxLine: 0,
      payroll: 0,
      capSpace: 0,
      taxBill: 0,
      projectedTaxBill: 0,
      baseRevenue: 300_000_000,
      localRevenue: 40_000_000,
      seasonPerformanceBonus: 10_000_000,
      totalRevenue: 0,
      operatingExpenses: 0,
      totalExpenses: 0,
      netIncome: 0,
      ownerCash: 0,
      cashReserves: 0,
      ownerPatience: 0,
      exceptionsUsed: { mle: false, bae: false, roomMle: false, minimumCount: 0 },
    }
    expect(computeTotalRevenue(finances)).toBe(350_000_000)
  })

  it('returns 0 when all revenue components are 0', () => {
    const finances: TeamFinances = {
      salaryCap: 0,
      apron: 0,
      secondApron: 0,
      luxuryTaxLine: 0,
      payroll: 0,
      capSpace: 0,
      taxBill: 0,
      projectedTaxBill: 0,
      baseRevenue: 0,
      localRevenue: 0,
      seasonPerformanceBonus: 0,
      totalRevenue: 0,
      operatingExpenses: 0,
      totalExpenses: 0,
      netIncome: 0,
      ownerCash: 0,
      cashReserves: 0,
      ownerPatience: 0,
      exceptionsUsed: { mle: false, bae: false, roomMle: false, minimumCount: 0 },
    }
    expect(computeTotalRevenue(finances)).toBe(0)
  })

  it('sums arbitrary revenue components exactly', () => {
    const finances: TeamFinances = {
      salaryCap: 0,
      apron: 0,
      secondApron: 0,
      luxuryTaxLine: 0,
      payroll: 0,
      capSpace: 0,
      taxBill: 0,
      projectedTaxBill: 0,
      baseRevenue: 123_000_000,
      localRevenue: 45_500_000,
      seasonPerformanceBonus: 7_500_000,
      totalRevenue: 0,
      operatingExpenses: 0,
      totalExpenses: 0,
      netIncome: 0,
      ownerCash: 0,
      cashReserves: 0,
      ownerPatience: 0,
      exceptionsUsed: { mle: false, bae: false, roomMle: false, minimumCount: 0 },
    }

    expect(computeTotalRevenue(finances)).toBe(176_000_000)
  })
})
