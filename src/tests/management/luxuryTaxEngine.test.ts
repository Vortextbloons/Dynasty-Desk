// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeFullTaxBill } from '@/game/management/luxuryTaxEngine'
import { makeTeam } from '@/tests/fixtures'
import { DEFAULT_LEAGUE_RULES, getLeagueRules } from '@/game/models/leagueRules'

const rules = getLeagueRules('2025-26')

describe('computeFullTaxBill', () => {
  it('non-taxpayer: payroll below tax line returns zeros', () => {
    const team = makeTeam({
      finances: {
        ...makeTeam().finances,
        payroll: 150_000_000,
      },
    })
    const result = computeFullTaxBill(team, rules, 0, 2025)
    expect(result.totalTaxBill).toBe(0)
    expect(result.isTaxpayer).toBe(false)
    expect(result.isRepeater).toBe(false)
    expect(result.triggersPickFreeze).toBe(false)
  })

  it('non-repeater: 5M over produces ~$7.5M tax', () => {
    const team = makeTeam({
      finances: {
        ...makeTeam().finances,
        payroll: DEFAULT_LEAGUE_RULES.luxuryTaxLine + 5_000_000,
      },
    })
    const result = computeFullTaxBill(team, rules, 0, 2025)
    expect(result.isTaxpayer).toBe(true)
    expect(result.bracketTax).toBe(7_500_000)
    expect(result.isRepeater).toBe(false)
  })

  it('repeater (3+ prior years) produces higher tax', () => {
    const team = makeTeam({
      finances: {
        ...makeTeam().finances,
        payroll: DEFAULT_LEAGUE_RULES.luxuryTaxLine + 5_000_000,
      },
    })
    const result = computeFullTaxBill(team, rules, 3, 2025)
    expect(result.isRepeater).toBe(true)
    expect(result.bracketTax).toBe(12_500_000)
  })

  it('2nd apron triggers pick freeze flag', () => {
    const team = makeTeam({
      finances: {
        ...makeTeam().finances,
        payroll: DEFAULT_LEAGUE_RULES.secondApron,
      },
    })
    const result = computeFullTaxBill(team, rules, 0, 2025)
    expect(result.triggersPickFreeze).toBe(true)
  })

  it('apron penalty when over first apron', () => {
    const team = makeTeam({
      finances: {
        ...makeTeam().finances,
        payroll: DEFAULT_LEAGUE_RULES.apron + 1_000_000,
      },
    })
    const result = computeFullTaxBill(team, rules, 0, 2025)
    expect(result.apronPenalty).toBeGreaterThan(0)
  })

  it('bracket detail sums to total bracket tax', () => {
    const team = makeTeam({
      finances: {
        ...makeTeam().finances,
        payroll: 200_000_000,
      },
    })
    const result = computeFullTaxBill(team, rules, 0, 2025)
    const summed = result.bracketDetail.reduce((sum, b) => sum + b.amount, 0)
    expect(Math.round(summed)).toBe(result.bracketTax)
  })
})
