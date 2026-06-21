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
  state?: { clock?: { period: number; timeRemainingSeconds: number }; score?: { home: number; away: number }; momentum?: [number, number] },
): SimEvent[] {
  const ranked = [...events]
    .map((e) => {
      let impact = eventImpact(e)
      if (state?.clock) {
        const isClutch = state.clock.period >= 4 && state.clock.timeRemainingSeconds <= 300
        if (isClutch) impact *= 1.5
        if ('timeRemainingSeconds' in e && e.timeRemainingSeconds !== undefined) {
          if (e.timeRemainingSeconds < 0.3 && e.type === 'shot' && (e as Extract<SimEvent, { type: 'shot' }>).made) {
            impact *= 2.0
          }
          if (e.timeRemainingSeconds <= 5 && e.type === 'shot') {
            const shot = e as Extract<SimEvent, { type: 'shot' }>
            if (shot.made && state.score) {
              const diff = state.score.home - state.score.away
              if (Math.abs(diff) <= 3) impact *= 2.0
            }
          }
        }
      }
      if (state?.momentum) {
        const homeMom = state.momentum[0]
        const awayMom = state.momentum[1]
        if (homeMom > 65 || awayMom > 65) impact *= 1.3
      }
      return { e, impact }
    })
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
