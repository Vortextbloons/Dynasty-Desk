import type { SeededRandom } from '@/game/sim/rng'
import {
  HOLD_FOR_LAST_SHOT_THRESHOLD,
  TWO_FOR_ONE_MIN,
  TWO_FOR_ONE_MAX,
  INTENTIONAL_FOUL_WINDOW,
  RUN_OUT_CLOCK_THRESHOLD,
  CATCH_UP_DEFICIT_MIN,
  CATCH_UP_DEFICIT_MAX,
  CATCH_UP_CLOCK_MAX,
  MAINTAIN_LEAD_DEFICIT_MIN,
  MAINTAIN_LEAD_DEFICIT_MAX,
  MAINTAIN_LEAD_CLOCK_MAX,
  CATCH_UP_MEAN_PACE,
  MAINTAIN_LEAD_MEAN_PACE,
  HOLD_FOR_LAST_SHOT_MEAN_PACE,
  TWO_FOR_ONE_MEAN_PACE,
  NORMAL_MEAN_PACE,
  INTENTIONAL_FOUL_MIN_SCORE_DIFF,
  INTENTIONAL_FOUL_MAX_SCORE_DIFF,
  TIMEOUT_CLOCK_THRESHOLD,
  TIMEOUT_DEFICIT_MAX,
  FINAL_PERIOD,
} from '@/game/sim/simConstants'

export type ClockFactor =
  | 'normal'
  | 'holdForLastShot'
  | 'twoForOne'
  | 'runOutClock'
  | 'catchUp'
  | 'maintainLead'

export interface ClockFactorResult {
  factor: ClockFactor
  meanPace: number
}

export function getClockFactor(
  period: number,
  clock: number,
  scoreDiff: number,
  isOffenseHome: boolean,
): ClockFactorResult {
  const absDiff = Math.abs(scoreDiff)
  const trailing = scoreDiff > 0 ? !isOffenseHome : isOffenseHome
  const leading = !trailing

  const isFinalPeriod = period >= FINAL_PERIOD

  if (isFinalPeriod && clock <= RUN_OUT_CLOCK_THRESHOLD && leading && absDiff > 3) {
    return { factor: 'runOutClock', meanPace: clock }
  }

  if (isFinalPeriod && clock <= HOLD_FOR_LAST_SHOT_THRESHOLD && !trailing && absDiff <= 10) {
    return { factor: 'holdForLastShot', meanPace: HOLD_FOR_LAST_SHOT_MEAN_PACE }
  }

  if (isFinalPeriod && clock >= TWO_FOR_ONE_MIN && clock <= TWO_FOR_ONE_MAX) {
    return { factor: 'twoForOne', meanPace: TWO_FOR_ONE_MEAN_PACE }
  }

  if (isFinalPeriod && clock <= CATCH_UP_CLOCK_MAX && trailing && absDiff >= CATCH_UP_DEFICIT_MIN && absDiff <= CATCH_UP_DEFICIT_MAX) {
    return { factor: 'catchUp', meanPace: CATCH_UP_MEAN_PACE }
  }

  if (isFinalPeriod && clock <= MAINTAIN_LEAD_CLOCK_MAX && leading && absDiff >= MAINTAIN_LEAD_DEFICIT_MIN && absDiff <= MAINTAIN_LEAD_DEFICIT_MAX) {
    return { factor: 'maintainLead', meanPace: MAINTAIN_LEAD_MEAN_PACE }
  }

  return { factor: 'normal', meanPace: NORMAL_MEAN_PACE }
}

export function getClockFactorPace(factor: ClockFactor, rng: SeededRandom): number {
  const base = factor === 'normal'
    ? NORMAL_MEAN_PACE
    : factor === 'holdForLastShot'
      ? HOLD_FOR_LAST_SHOT_MEAN_PACE
      : factor === 'twoForOne'
        ? TWO_FOR_ONE_MEAN_PACE
        : factor === 'catchUp'
          ? CATCH_UP_MEAN_PACE
          : factor === 'maintainLead'
            ? MAINTAIN_LEAD_MEAN_PACE
            : NORMAL_MEAN_PACE

  const stdDev = base * 0.3
  const raw = rng.next() * stdDev * 2 + (base - stdDev)
  return Math.max(1, Math.min(raw, base * 2))
}

export function shouldIntentionalFoul(
  period: number,
  clock: number,
  offenseScore: number,
  defenseScore: number,
  foulsUntilBonus: number,
): boolean {
  const diff = offenseScore - defenseScore
  const isFinalPeriod = period >= FINAL_PERIOD
  return (
    diff > INTENTIONAL_FOUL_MIN_SCORE_DIFF &&
    diff <= INTENTIONAL_FOUL_MAX_SCORE_DIFF &&
    isFinalPeriod &&
    clock > 0.3 &&
    clock < INTENTIONAL_FOUL_WINDOW &&
    foulsUntilBonus > 1
  )
}

export function shouldCallTimeout(
  period: number,
  clock: number,
  deficit: number,
): boolean {
  const isFinalPeriod = period >= FINAL_PERIOD
  if (!isFinalPeriod) return false
  if (clock < TIMEOUT_CLOCK_THRESHOLD) return true
  if (clock <= 60 && deficit <= TIMEOUT_DEFICIT_MAX) return true
  return false
}

export function isFinalShotAttempt(
  clock: number,
  scoreDiff: number,
): boolean {
  return clock < 3 && Math.abs(scoreDiff) <= 3
}
