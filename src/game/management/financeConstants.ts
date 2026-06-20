import type { TeamSeasonResult } from '@/game/models/league'

export const NBA_2025_26_BRI_RATIO = 0.45
export const LOCAL_REVENUE_BASELINE = 2_000_000
export const ATTENDANCE_FACTOR_MIN = 0.7
export const ATTENDANCE_FACTOR_MAX = 1.1

export const MAX_EXTENSION_RAISE_PCT = 0.08
export const STRETCH_MULTIPLIER = 2
export const BUYOUT_SETOFF_DIVISOR = 2

export const SOFT_CASH_RATIO_THRESHOLD = 0.5
export const SOFT_CASH_SEASONS_TO_TRIGGER = 2

export const SEASON_PERFORMANCE_BONUS: Record<TeamSeasonResult, number> = {
  missed_playoffs: 0,
  first_round_loss: 5_000_000,
  second_round_loss: 10_000_000,
  conference_finals_loss: 15_000_000,
  finals_loss: 25_000_000,
  champion: 40_000_000,
}

export interface TaxBracket {
  threshold: number
  rate: number
}

export const TAX_BRACKETS_NON_REPEATER: TaxBracket[] = [
  { threshold: 0, rate: 1.5 },
  { threshold: 5_000_000, rate: 1.75 },
  { threshold: 10_000_000, rate: 2.25 },
  { threshold: 15_000_000, rate: 2.75 },
  { threshold: 20_000_000, rate: 3.25 },
  { threshold: 25_000_000, rate: 3.75 },
]

export const TAX_BRACKETS_REPEATER: TaxBracket[] = [
  { threshold: 0, rate: 2.5 },
  { threshold: 5_000_000, rate: 2.75 },
  { threshold: 10_000_000, rate: 3.5 },
  { threshold: 15_000_000, rate: 4.25 },
  { threshold: 20_000_000, rate: 5.0 },
  { threshold: 25_000_000, rate: 5.75 },
]

export const OPERATING_EXPENSES_BASELINE = 10_000_000
export const OWNER_CASH_INITIAL = 50_000_000
export const CASH_RESERVES_INITIAL = 100_000_000
export const OWNER_PATIENCE_INITIAL = 70
