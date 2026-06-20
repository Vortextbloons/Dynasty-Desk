import type { LeagueRules } from '@/game/models/leagueRules'
import type { Team } from '@/game/models/team'
import {
  TAX_BRACKETS_NON_REPEATER,
  TAX_BRACKETS_REPEATER,
} from './financeConstants'

export interface LuxuryTaxBreakdown {
  bracketTax: number
  apronPenalty: number
  totalTaxBill: number
  isTaxpayer: boolean
  isRepeater: boolean
  triggersPickFreeze: boolean
  bracketDetail: Array<{ threshold: number; rate: number; amount: number }>
}

export function computeFullTaxBill(
  team: Team,
  rules: LeagueRules,
  priorTaxpayerYears: number,
  currentYear: number,
): LuxuryTaxBreakdown {
  const hasLuxuryTax = rules.luxuryTaxLine > 0
  const excess = team.finances.payroll - rules.luxuryTaxLine
  const isTaxpayer = hasLuxuryTax && excess > 0

  if (!isTaxpayer) {
    return {
      bracketTax: 0,
      apronPenalty: 0,
      totalTaxBill: 0,
      isTaxpayer: false,
      isRepeater: false,
      triggersPickFreeze: false,
      bracketDetail: [],
    }
  }

  const isRepeater = priorTaxpayerYears >= 3
  const brackets = isRepeater
    ? TAX_BRACKETS_REPEATER
    : TAX_BRACKETS_NON_REPEATER

  const taxRate = brackets[0]?.rate ?? rules.luxuryTaxRates.nonTaxpayer

  const bracketDetail: LuxuryTaxBreakdown['bracketDetail'] = []
  let remaining = excess
  let bracketTax = 0

  for (let i = 0; i < brackets.length; i++) {
    const current = brackets[i]!
    const next = brackets[i + 1]
    const bracketSize = next ? next.threshold - current.threshold : excess
    const inBracket = Math.min(remaining, bracketSize)
    const amount = inBracket * current.rate
    bracketDetail.push({ threshold: current.threshold, rate: current.rate, amount })
    bracketTax += amount
    remaining -= inBracket
    if (remaining <= 0) break
  }

  bracketTax = Math.round(bracketTax)

  let apronPenalty = 0
  const overApron = Math.max(0, team.finances.payroll - rules.apron)
  if (overApron > 0) {
    apronPenalty = Math.round(
      overApron * rules.apronPenaltyPerMillion,
    )
  }

  const triggersPickFreeze =
    rules.secondApron > 0 && team.finances.payroll >= rules.secondApron
  void taxRate
  void currentYear

  return {
    bracketTax,
    apronPenalty,
    totalTaxBill: bracketTax + apronPenalty,
    isTaxpayer: true,
    isRepeater,
    triggersPickFreeze,
    bracketDetail,
  }
}
