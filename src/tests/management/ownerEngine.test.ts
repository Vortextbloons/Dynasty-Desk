import { describe, it, expect } from 'vitest'
import {
  evaluateBudgetTolerance,
  softCashPressureTick,
} from '@/game/management/ownerEngine'
import type { OwnerProfile } from '@/game/models/owner'
import type { TeamFinances } from '@/game/models/team'

function makeOwner(
  overrides: Partial<OwnerProfile> = {},
): OwnerProfile {
  return {
    teamId: 'team-1',
    name: 'Test Owner',
    personality: 'patient',
    netWorth: 2_000_000_000,
    cash: 50_000_000,
    softCashPressureSeasons: 0,
    ...overrides,
  }
}

function makeFinances(
  overrides: Partial<TeamFinances> = {},
): TeamFinances {
  return {
    salaryCap: 140_588_000,
    apron: 178_132_000,
    secondApron: 189_502_000,
    luxuryTaxLine: 171_314_000,
    payroll: 120_000_000,
    capSpace: 20_588_000,
    taxBill: 0,
    projectedTaxBill: 0,
    baseRevenue: 0,
    localRevenue: 0,
    seasonPerformanceBonus: 0,
    totalRevenue: 0,
    operatingExpenses: 10_000_000,
    totalExpenses: 30_000_000,
    netIncome: 0,
    ownerCash: 50_000_000,
    cashReserves: 100_000_000,
    ownerPatience: 70,
    exceptionsUsed: { mle: false, bae: false, roomMle: false, minimumCount: 0 },
    ...overrides,
  }
}

describe('evaluateBudgetTolerance', () => {
  it('spendthrift: canPayTax, canExceedApron, canUseMLE', () => {
    const owner = makeOwner({ personality: 'spendthrift', cash: 1_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result).toEqual({
      canPayTax: true,
      canExceedApron: true,
      canUseMLE: true,
    })
  })

  it('win_now: same as spendthrift', () => {
    const owner = makeOwner({ personality: 'win_now', cash: 1_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result).toEqual({
      canPayTax: true,
      canExceedApron: true,
      canUseMLE: true,
    })
  })

  it('frugal: cannot pay tax, exceed apron, or use MLE', () => {
    const owner = makeOwner({ personality: 'frugal', cash: 100_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result).toEqual({
      canPayTax: false,
      canExceedApron: false,
      canUseMLE: false,
    })
  })

  it('patient with enough cash: can pay tax', () => {
    const owner = makeOwner({ personality: 'patient', cash: 25_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result.canPayTax).toBe(true)
    expect(result.canExceedApron).toBe(false) // cash <= 30M
    expect(result.canUseMLE).toBe(true)
  })

  it('patient with low cash: cannot pay tax', () => {
    const owner = makeOwner({ personality: 'patient', cash: 15_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result.canPayTax).toBe(false) // cash <= 20M
  })

  it('hands_off: same thresholds as patient', () => {
    const owner = makeOwner({ personality: 'hands_off', cash: 25_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result.canPayTax).toBe(true)
    expect(result.canExceedApron).toBe(false)
    expect(result.canUseMLE).toBe(true)
  })

  it('meddler with high cash: can pay tax but not exceed apron', () => {
    const owner = makeOwner({ personality: 'meddler', cash: 45_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result.canPayTax).toBe(true) // cash > 40M
    expect(result.canExceedApron).toBe(false) // always false for meddler
    expect(result.canUseMLE).toBe(true)
  })

  it('meddler with low cash: cannot pay tax', () => {
    const owner = makeOwner({ personality: 'meddler', cash: 30_000_000 })
    const finances = makeFinances()
    const result = evaluateBudgetTolerance(owner, finances)
    expect(result.canPayTax).toBe(false) // cash <= 40M
  })
})

describe('softCashPressureTick', () => {
  it('ratio below threshold: newSeasons increments', () => {
    // cash / totalExpenses = 10M / 30M = 0.33 < 0.5
    const owner = makeOwner({ cash: 10_000_000, personality: 'patient' })
    const finances = makeFinances({ totalExpenses: 30_000_000 })
    const result = softCashPressureTick(owner, finances, 0, '2026-01-01', 'team-1')
    expect(result.newSeasons).toBe(1)
    expect(result.triggered).toBe(false)
    expect(result.event).toBeNull()
  })

  it('ratio above threshold: resets seasons to 0', () => {
    // cash / totalExpenses = 50M / 30M = 1.67 > 0.5
    const owner = makeOwner({ cash: 50_000_000 })
    const finances = makeFinances({ totalExpenses: 30_000_000 })
    const result = softCashPressureTick(owner, finances, 2, '2026-01-01', 'team-1')
    expect(result.newSeasons).toBe(0)
    expect(result.patienceDelta).toBe(0)
  })

  it('2 seasons below threshold: fires event', () => {
    // Prior 1 season + this tick = 2 seasons >= SOFT_CASH_SEASONS_TO_TRIGGER
    const owner = makeOwner({ cash: 10_000_000, personality: 'patient' })
    const finances = makeFinances({ totalExpenses: 30_000_000 })
    const result = softCashPressureTick(owner, finances, 1, '2026-01-01', 'team-1')
    expect(result.triggered).toBe(true)
    expect(result.newSeasons).toBe(2)
    expect(result.event).not.toBeNull()
    expect(result.event!.type).toBe('financial_review')
    expect(result.event!.headline).toContain('Test Owner')
    expect(result.event!.teamIds).toContain('team-1')
  })

  it('patient personality: smaller patience drop', () => {
    const owner = makeOwner({ cash: 10_000_000, personality: 'patient' })
    const finances = makeFinances({ totalExpenses: 30_000_000 })
    const result = softCashPressureTick(owner, finances, 0, '2026-01-01', 'team-1')
    expect(result.patienceDelta).toBe(-2)
  })

  it('non-patient personality: standard patience drop', () => {
    const owner = makeOwner({ cash: 10_000_000, personality: 'frugal' })
    const finances = makeFinances({ totalExpenses: 30_000_000 })
    const result = softCashPressureTick(owner, finances, 0, '2026-01-01', 'team-1')
    expect(result.patienceDelta).toBe(-5)
  })

  it('zero expenses: ratio defaults to 1 (no pressure)', () => {
    const owner = makeOwner({ cash: 10_000_000 })
    const finances = makeFinances({ totalExpenses: 0 })
    const result = softCashPressureTick(owner, finances, 0, '2026-01-01', 'team-1')
    expect(result.newSeasons).toBe(0)
    expect(result.triggered).toBe(false)
  })
})
