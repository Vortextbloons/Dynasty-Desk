import type { Contract } from '@/game/models/contract'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { Player } from '@/game/models/player'
import type { Team } from '@/game/models/team'
import type { TradeKicker } from '@/game/models/contract'
import {
  TAX_BRACKETS_NON_REPEATER,
  TAX_BRACKETS_REPEATER,
} from './financeConstants'

export function computeCapHit(
  player: Player,
  _rules: LeagueRules,
  year = 0,
): number {
  const c: Contract = player.contract
  const salary = c.salaryByYear[year] ?? 0
  const signingBonus = c.signingBonusByYear[year] ?? 0
  const likelyBonus = c.likelyBonusesByYear[year] ?? 0

  let tradeKickerAmount = 0
  for (const tk of c.tradeKickers) {
    if (isTradeKickerMet(tk, year)) {
      tradeKickerAmount += tk.amount
    }
  }

  let poisonPillAdd = 0
  if (c.poisonPill && c.yearsRemaining > 1) {
    const remainingAfter = c.salaryByYear
      .slice(year + 1)
      .reduce((sum, s) => sum + s, 0)
    poisonPillAdd = remainingAfter * 0.5
  }

  return salary + signingBonus + likelyBonus + tradeKickerAmount + poisonPillAdd
}

function isTradeKickerMet(tk: TradeKicker, _year: number): boolean {
  switch (tk.condition) {
    case 'on_roster_date':
      return true
    case 'minutes_threshold':
      return false
    case 'games_played':
      return false
  }
}

export function computePayroll(
  team: Team,
  players: Record<string, Player>,
  rules: LeagueRules,
  year = 0,
): number {
  let total = 0
  for (const pid of team.roster) {
    const player = players[pid]
    if (player) {
      total += computeCapHit(player, rules, year)
    }
  }
  return total
}

export function computeCapSpace(team: Team, rules: LeagueRules): number {
  return rules.salaryCap - team.finances.payroll
}

export function computeApronStatus(
  team: Team,
  rules: LeagueRules,
): 'below' | 'first' | 'second' {
  if (rules.apron <= 0 || rules.secondApron <= 0) return 'below'
  if (team.finances.payroll >= rules.secondApron) return 'second'
  if (team.finances.payroll >= rules.apron) return 'first'
  return 'below'
}

export function computeTaxBill(
  team: Team,
  rules: LeagueRules,
  priorTaxpayerYears: number,
): number {
  const excess = team.finances.payroll - rules.luxuryTaxLine
  if (excess <= 0) return 0

  const brackets =
    priorTaxpayerYears >= 3
      ? TAX_BRACKETS_REPEATER
      : TAX_BRACKETS_NON_REPEATER

  let tax = 0
  let remaining = excess

  for (let i = 0; i < brackets.length; i++) {
    const current = brackets[i]!
    const next = brackets[i + 1]
    const bracketSize = next
      ? next.threshold - current.threshold
      : excess
    const inBracket = Math.min(remaining, bracketSize)
    tax += inBracket * current.rate
    remaining -= inBracket
    if (remaining <= 0) break
  }

  return Math.round(tax)
}
