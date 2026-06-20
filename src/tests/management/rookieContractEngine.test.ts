import { describe, it, expect } from 'vitest'
import { generateRookieContract, getRookieScaleSalary } from '@/game/management/rookieContractEngine'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'

describe('rookieContractEngine', () => {
  it('slot 1 contract ≈ $10.5M / yr', () => {
    const salary = getRookieScaleSalary(1, DEFAULT_LEAGUE_RULES)
    expect(salary).toBeGreaterThanOrEqual(10_000_000)
    expect(salary).toBeLessThanOrEqual(11_000_000)
  })

  it('slot 30 contract ≈ $2.5M / yr', () => {
    const salary = getRookieScaleSalary(30, DEFAULT_LEAGUE_RULES)
    expect(salary).toBeGreaterThanOrEqual(2_200_000)
    expect(salary).toBeLessThanOrEqual(2_600_000)
  })

  it('two-way contract: ~$0.55M / yr, 2 years', () => {
    const c = generateRookieContract(45, 'pick-1', 'p-1', 'team-1', DEFAULT_LEAGUE_RULES, true)
    expect(c.isTwoWay).toBe(true)
    expect(c.yearsTotal).toBe(2)
    expect(c.salaryByYear[0]).toBeGreaterThanOrEqual(500_000)
    expect(c.salaryByYear[0]).toBeLessThanOrEqual(600_000)
  })
})
