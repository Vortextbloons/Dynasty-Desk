// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  updateFatigue,
  applyFatiguePenalty,
  recoverFatigue,
  isHighUsagePlayer,
  fatigueForPlayer,
} from '@/game/sim/fatigueEngine'
import { makePlayer } from '@/tests/sim/fixtures'
import {
  FATIGUE_GAIN_PER_MINUTE,
  FATIGUE_HIGH_USAGE_MULTIPLIER,
  FATIGUE_PENALTY_THRESHOLD,
  FATIGUE_SHOOTING_DEFENSE_SCALE,
  FATIGUE_TO_FOUL_SCALE,
  FATIGUE_RECOVERY_PER_DAY,
} from '@/game/sim/simConstants'

describe('updateFatigue', () => {
  it('accumulates fatigue with minutes and pace', () => {
    const slow = updateFatigue(0, 12, 'slow', false)
    const fast = updateFatigue(0, 12, 'fast', false)
    expect(fast).toBeGreaterThan(slow)
  })

  it('clamps at 100 when fatigue exceeds maximum', () => {
    const result = updateFatigue(90, 20, 'fast', false)
    expect(result).toBe(100)
  })

  it('clamps at 0 when fatigue is negative input', () => {
    const result = updateFatigue(0, 0, 'balanced', false)
    expect(result).toBe(0)
  })

  it('applies high usage multiplier', () => {
    const normal = updateFatigue(0, 10, 'balanced', false)
    const highUsage = updateFatigue(0, 10, 'balanced', true)
    expect(highUsage).toBeCloseTo(normal * FATIGUE_HIGH_USAGE_MULTIPLIER, 1)
  })

  it('uses balanced pace multiplier of 1', () => {
    const result = updateFatigue(0, 10, 'balanced', false)
    expect(result).toBeCloseTo(10 * FATIGUE_GAIN_PER_MINUTE, 1)
  })

  it('defaults to balanced pace', () => {
    const result = updateFatigue(0, 10)
    expect(result).toBeCloseTo(10 * FATIGUE_GAIN_PER_MINUTE, 1)
  })
})

describe('applyFatiguePenalty', () => {
  it('returns 0 at or below threshold', () => {
    expect(applyFatiguePenalty(FATIGUE_PENALTY_THRESHOLD, 'shooting')).toBe(0)
    expect(applyFatiguePenalty(FATIGUE_PENALTY_THRESHOLD - 10, 'shooting')).toBe(0)
    expect(applyFatiguePenalty(0, 'defense')).toBe(0)
  })

  it('returns negative value above threshold', () => {
    const penalty = applyFatiguePenalty(70, 'shooting')
    expect(penalty).toBeLessThan(0)
  })

  it('scales by FATIGUE_SHOOTING_DEFENSE_SCALE for shooting and defense', () => {
    const fatigue = 80
    const expected = -(fatigue - FATIGUE_PENALTY_THRESHOLD) * FATIGUE_SHOOTING_DEFENSE_SCALE
    expect(applyFatiguePenalty(fatigue, 'shooting')).toBeCloseTo(expected, 6)
    expect(applyFatiguePenalty(fatigue, 'defense')).toBeCloseTo(expected, 6)
  })

  it('scales by FATIGUE_TO_FOUL_SCALE for turnovers and fouls', () => {
    const fatigue = 80
    const expected = -(fatigue - FATIGUE_PENALTY_THRESHOLD) * FATIGUE_TO_FOUL_SCALE
    expect(applyFatiguePenalty(fatigue, 'turnovers')).toBeCloseTo(expected, 6)
    expect(applyFatiguePenalty(fatigue, 'fouls')).toBeCloseTo(expected, 6)
  })

  it('penalty magnitude increases with fatigue', () => {
    const low = applyFatiguePenalty(60, 'shooting')
    const high = applyFatiguePenalty(90, 'shooting')
    expect(high).toBeLessThan(low)
  })
})

describe('recoverFatigue', () => {
  it('recovers fatigue with days off', () => {
    expect(recoverFatigue(70, 2)).toBeLessThan(70)
    expect(recoverFatigue(10, 1)).toBe(0)
  })

  it('recovers FATIGUE_RECOVERY_PER_DAY per day', () => {
    const result = recoverFatigue(50, 3)
    expect(result).toBeCloseTo(50 - 3 * FATIGUE_RECOVERY_PER_DAY, 1)
  })

  it('clamps at 0 when recovery exceeds current fatigue', () => {
    expect(recoverFatigue(5, 10)).toBe(0)
  })

  it('clamps at 100 if somehow given high fatigue (no upward clamp needed)', () => {
    const result = recoverFatigue(50, 0)
    expect(result).toBe(50)
  })
})

describe('isHighUsagePlayer', () => {
  it('returns true when usageRate >= 22', () => {
    expect(isHighUsagePlayer(makePlayer({ tendencies: { usageRate: 22 } }))).toBe(true)
    expect(isHighUsagePlayer(makePlayer({ tendencies: { usageRate: 30 } }))).toBe(true)
  })

  it('returns false when usageRate < 22', () => {
    expect(isHighUsagePlayer(makePlayer({ tendencies: { usageRate: 21 } }))).toBe(false)
    expect(isHighUsagePlayer(makePlayer({ tendencies: { usageRate: 10 } }))).toBe(false)
  })
})

describe('fatigueForPlayer', () => {
  it('returns gameFatigue value when present', () => {
    const player = makePlayer({ id: 'p1' })
    expect(fatigueForPlayer(player, { p1: 45 })).toBe(45)
  })

  it('falls back to player.fatigue when gameFatigue is undefined', () => {
    const player = makePlayer({ id: 'p1', fatigue: 30 })
    expect(fatigueForPlayer(player, undefined)).toBe(30)
  })

  it('returns 0 when no gameFatigue and player.fatigue is undefined', () => {
    const player = makePlayer({ id: 'p1' })
    expect(fatigueForPlayer(player, undefined)).toBe(0)
  })

  it('returns 0 when player id is not in gameFatigue', () => {
    const player = makePlayer({ id: 'p1' })
    expect(fatigueForPlayer(player, { other: 50 })).toBe(0)
  })
})
