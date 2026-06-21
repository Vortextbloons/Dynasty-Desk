import type { SimEvent } from '@/game/models/sim'
import { KEY_PLAYS_LIMIT } from '@/game/sim/simConstants'

export function eventImpact(event: SimEvent): number {
  switch (event.type) {
    case 'shot':
      return event.impact
    case 'rebound':
      return event.impact
    case 'turnover':
      return event.impact
    case 'foul':
      return event.impact ?? 15
    case 'freeThrow':
      return event.made ? 18 : 8
    case 'substitution':
      return 0
    case 'endOfPeriod':
      return 0
  }
}

export function rankKeyPlays(
  events: readonly SimEvent[],
  limit: number = KEY_PLAYS_LIMIT,
): SimEvent[] {
  const ranked = [...events]
    .map((e) => ({ e, impact: eventImpact(e) }))
    .filter((x) => x.impact > 0)
    .sort((a, b) => {
      if (b.impact !== a.impact) return b.impact - a.impact
      const aTime = 'timeRemainingSeconds' in a.e ? a.e.timeRemainingSeconds : 720
      const bTime = 'timeRemainingSeconds' in b.e ? b.e.timeRemainingSeconds : 720
      if (aTime !== bTime) return aTime - bTime
      return a.e.type.localeCompare(b.e.type)
    })
  return ranked.slice(0, limit).map((x) => x.e)
}
