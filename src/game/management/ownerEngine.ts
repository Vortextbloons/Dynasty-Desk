import type { OwnerProfile } from '@/game/models/owner'
import type { TeamFinances } from '@/game/models/team'
import type { NewsEvent } from '@/game/models/news'
import {
  SOFT_CASH_RATIO_THRESHOLD,
  SOFT_CASH_SEASONS_TO_TRIGGER,
} from './financeConstants'

export { evaluateTradeForAI as maybeVetoTrade } from './tradeAI'

export interface BudgetTolerance {
  canPayTax: boolean
  canExceedApron: boolean
  canUseMLE: boolean
}

export function evaluateBudgetTolerance(
  owner: OwnerProfile,
  _finances: TeamFinances,
): BudgetTolerance {
  switch (owner.personality) {
    case 'spendthrift':
    case 'win_now':
      return { canPayTax: true, canExceedApron: true, canUseMLE: true }
    case 'patient':
    case 'hands_off':
      return {
        canPayTax: owner.cash > 20_000_000,
        canExceedApron: owner.cash > 30_000_000,
        canUseMLE: true,
      }
    case 'frugal':
      return { canPayTax: false, canExceedApron: false, canUseMLE: false }
    case 'meddler':
      return {
        canPayTax: owner.cash > 40_000_000,
        canExceedApron: false,
        canUseMLE: true,
      }
  }
}

export interface SoftCashPressureResult {
  triggered: boolean
  newSeasons: number
  patienceDelta: number
  event: NewsEvent | null
}

export function softCashPressureTick(
  owner: OwnerProfile,
  finances: TeamFinances,
  priorSeasons: number,
  currentDate: string,
  teamId: string,
): SoftCashPressureResult {
  const ratio =
    finances.totalExpenses > 0
      ? owner.cash / finances.totalExpenses
      : 1

  if (ratio < SOFT_CASH_RATIO_THRESHOLD) {
    const newSeasons = priorSeasons + 1
    let patienceDelta = -5
    if (owner.personality === 'patient') {
      patienceDelta = -2
    }

    if (newSeasons >= SOFT_CASH_SEASONS_TO_TRIGGER) {
      return {
        triggered: true,
        newSeasons,
        patienceDelta,
        event: {
          id: crypto.randomUUID(),
          date: currentDate,
          type: 'financial_review',
          headline: `${owner.name} demands financial review`,
          body: `${owner.name} has called a financial review due to sustained cash pressure. Owner patience is wearing thin.`,
          teamIds: [teamId],
          playerIds: [],
          importance: 'medium',
        },
      }
    }

    return {
      triggered: false,
      newSeasons,
      patienceDelta,
      event: null,
    }
  }

  return { triggered: false, newSeasons: 0, patienceDelta: 0, event: null }
}
