// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { rankKeyPlays, eventImpact } from '@/game/sim/keyPlays'
import type { SimEvent } from '@/game/models/sim'

const shot = (impact: number, period = 4, time = 100): SimEvent => ({
  type: 'shot',
  playerId: 'p',
  teamId: 't',
  zone: 'at_rim',
  shotType: 'drive',
  made: true,
  period,
  timeRemainingSeconds: time,
  impact,
})

const turnover = (impact = 35): SimEvent => ({
  type: 'turnover',
  playerId: 'p',
  teamId: 't',
  turnoverType: 'lost_ball',
  period: 4,
  timeRemainingSeconds: 100,
  impact,
})

const sub: SimEvent = {
  type: 'substitution',
  teamId: 't',
  out: 'a',
  in: 'b',
  period: 4,
  timeRemainingSeconds: 100,
}

describe('rankKeyPlays', () => {
  it('returns at most the requested limit', () => {
    const events = Array.from({ length: 20 }, (_, i) => shot(50 + i))
    const out = rankKeyPlays(events, 5)
    expect(out).toHaveLength(5)
  })

  it('orders by impact desc', () => {
    const events = [shot(60), shot(80), turnover(35)]
    const out = rankKeyPlays(events, 5)
    expect((out[0] as any).impact).toBe(80)
    expect((out[1] as any).impact).toBe(60)
    expect((out[2] as any).impact).toBe(35)
  })

  it('drops zero-impact events (subs, end of period)', () => {
    const events = [sub, { type: 'endOfPeriod' as const, period: 1 }, shot(80)]
    const out = rankKeyPlays(events, 5)
    expect(out).toHaveLength(1)
    expect(out[0]!.type).toBe('shot')
  })

  it('eventImpact handles all SimEvent types', () => {
    const events: SimEvent[] = [
      { type: 'shot', playerId: 'p', teamId: 't', zone: 'at_rim', shotType: 'drive', made: true, period: 1, timeRemainingSeconds: 600, impact: 75 },
      { type: 'rebound', playerId: 'p', teamId: 't', offensive: true, period: 1, timeRemainingSeconds: 600, impact: 35 },
      { type: 'turnover', playerId: 'p', teamId: 't', turnoverType: 'bad_pass', period: 1, timeRemainingSeconds: 600, impact: 35 },
      { type: 'foul', playerId: 'p', teamId: 't', kind: 'shooting', onShot: true, period: 1, timeRemainingSeconds: 600, impact: 20 },
      { type: 'freeThrow', playerId: 'p', teamId: 't', attempt: 1, made: true, period: 1, timeRemainingSeconds: 600 },
      { type: 'substitution', teamId: 't', out: 'a', in: 'b', period: 1, timeRemainingSeconds: 600 },
      { type: 'endOfPeriod', period: 1 },
    ]
    for (const e of events) {
      expect(typeof eventImpact(e)).toBe('number')
    }
  })
})
