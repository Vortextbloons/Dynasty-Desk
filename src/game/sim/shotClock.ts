import type { SeededRandom } from '@/game/sim/rng'
import { clamp } from '@/lib/utils'
import {
  SHOT_CLOCK_SECONDS,
  TRANSITION_SHOT_CLOCK,
  LATE_CLOCK_THRESHOLD,
  RUSH_CHANCE_LATE,
  RUSH_CHANCE_NORMAL,
} from '@/game/sim/simConstants'
import type { ClockFactor } from '@/game/sim/clockEngine'
import { getClockFactorPace } from '@/game/sim/clockEngine'

export { SHOT_CLOCK_SECONDS } from '@/game/sim/simConstants'

export interface ShotClockContext {
  shotClockRemaining: number
  period: number
  timeRemainingSeconds: number
  possessionType: 'half_court' | 'transition'
}

export interface ShotClockResult {
  shotAttempt: boolean
  timeElapsed: number
  lateShot: boolean
  violation: boolean
}

export function initialShotClock(
  possessionType: 'half_court' | 'transition',
): number {
  return possessionType === 'transition' ? TRANSITION_SHOT_CLOCK : SHOT_CLOCK_SECONDS
}

export function shotClockHandler(
  clock: number,
  ctx: ShotClockContext,
  rng: SeededRandom,
  clockFactor: ClockFactor = 'normal',
): ShotClockResult {
  let baseElapsed: number
  if (clockFactor === 'runOutClock') {
    baseElapsed = ctx.timeRemainingSeconds
  } else if (clockFactor === 'holdForLastShot') {
    baseElapsed = getClockFactorPace('holdForLastShot', rng)
  } else if (clockFactor === 'twoForOne') {
    baseElapsed = getClockFactorPace('twoForOne', rng)
  } else if (clockFactor === 'catchUp') {
    baseElapsed = getClockFactorPace('catchUp', rng)
  } else if (clockFactor === 'maintainLead') {
    baseElapsed = getClockFactorPace('maintainLead', rng)
  } else {
    baseElapsed =
      ctx.possessionType === 'transition'
        ? 6 + rng.next() * 4
        : 10 + rng.next() * 10
  }

  const timeElapsed = Math.min(baseElapsed, ctx.timeRemainingSeconds, clock)
  const remaining = clock - timeElapsed

  if (remaining <= 0) {
    return {
      shotAttempt: false,
      timeElapsed: clock,
      lateShot: false,
      violation: true,
    }
  }

  const lateShot = remaining <= LATE_CLOCK_THRESHOLD
  const rushChance = lateShot ? RUSH_CHANCE_LATE : RUSH_CHANCE_NORMAL
  const shotAttempt = rng.chance(rushChance) || remaining <= 2

  return {
    shotAttempt,
    timeElapsed,
    lateShot,
    violation: false,
  }
}

/** Late-clock rushed shots have lower make chance. */
export function lateClockMakePenalty(lateShot: boolean, clockRemaining: number): number {
  if (!lateShot) return 0
  const urgency = clamp((4 - clockRemaining) / 4, 0, 1)
  return -0.04 - urgency * 0.06
}

export function isEndOfQuarterHeave(
  _period: number,
  timeRemainingSeconds: number,
  shotClockRemaining: number,
): boolean {
  return timeRemainingSeconds <= 2 && shotClockRemaining > timeRemainingSeconds
}
