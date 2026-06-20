import { describe, it, expect } from 'vitest'
import {
  getBaseSalary,
  getContractYears,
  ANNUAL_RAISE_PCT,
} from '@/game/ratings/contractTierTable'

describe('getBaseSalary', () => {
  it('returns $1.5M for replacement-level (50)', () => {
    expect(getBaseSalary(50)).toBe(1_500_000)
  })

  it('returns $3M for 55 overall', () => {
    expect(getBaseSalary(55)).toBe(3_000_000)
  })

  it('returns $7M for 60 overall', () => {
    expect(getBaseSalary(60)).toBe(7_000_000)
  })

  it('returns $12M for 65 overall', () => {
    expect(getBaseSalary(65)).toBe(12_000_000)
  })

  it('returns $18M for starter (70)', () => {
    expect(getBaseSalary(70)).toBe(18_000_000)
  })

  it('returns $26M for 75 overall', () => {
    expect(getBaseSalary(75)).toBe(26_000_000)
  })

  it('returns $35M for all-star (80)', () => {
    expect(getBaseSalary(80)).toBe(35_000_000)
  })

  it('returns $45M for 85 overall', () => {
    expect(getBaseSalary(85)).toBe(45_000_000)
  })

  it('returns $55M for elite (90)', () => {
    expect(getBaseSalary(90)).toBe(55_000_000)
  })

  it('returns $65M for 95 overall', () => {
    expect(getBaseSalary(95)).toBe(65_000_000)
  })

  it('clamps to max tier for ratings above 95', () => {
    expect(getBaseSalary(99)).toBe(65_000_000)
    expect(getBaseSalary(100)).toBe(65_000_000)
  })

  it('clamps to min tier for ratings below 50', () => {
    expect(getBaseSalary(30)).toBe(1_500_000)
    expect(getBaseSalary(0)).toBe(1_500_000)
  })

  it('uses the highest matching tier for values between tiers', () => {
    // 72 overall should still be in the 70 tier ($18M) since 72 >= 70
    expect(getBaseSalary(72)).toBe(18_000_000)
    // 88 overall should be in the 85 tier ($45M) since 88 >= 85
    expect(getBaseSalary(88)).toBe(45_000_000)
  })
})

describe('getContractYears', () => {
  it('returns 1 for 1 year in league', () => {
    expect(getContractYears(1)).toBe(1)
  })

  it('returns 1 for 3 years in league', () => {
    expect(getContractYears(3)).toBe(1)
  })

  it('returns 2 for 5 years in league', () => {
    expect(getContractYears(5)).toBe(2)
  })

  it('returns 2 for 6 years in league', () => {
    expect(getContractYears(6)).toBe(2)
  })

  it('returns 4 for 7+ years in league', () => {
    expect(getContractYears(7)).toBe(4)
    expect(getContractYears(10)).toBe(4)
    expect(getContractYears(15)).toBe(4)
  })

  it('returns 1 for 0 years (rookie)', () => {
    expect(getContractYears(0)).toBe(1)
  })
})

describe('ANNUAL_RAISE_PCT', () => {
  it('is 8%', () => {
    expect(ANNUAL_RAISE_PCT).toBe(0.08)
  })
})
