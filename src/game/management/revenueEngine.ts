import type { LeagueRules } from '@/game/models/leagueRules'
import type { TeamSeasonResult } from '@/game/models/league'
import type { TeamFinances } from '@/game/models/team'
import {
  NBA_2025_26_BRI_RATIO,
  LOCAL_REVENUE_BASELINE,
  ATTENDANCE_FACTOR_MIN,
  ATTENDANCE_FACTOR_MAX,
  SEASON_PERFORMANCE_BONUS,
} from './financeConstants'

export function computeBaseRevenue(rules: LeagueRules): number {
  const bri = rules.salaryCap / NBA_2025_26_BRI_RATIO
  return Math.round(bri / 1_000_000) * 1_000_000
}

export function computeLocalRevenue(
  team: { marketSize: number; prestige: number },
  wins: number,
  totalGames: number,
): number {
  const winPct = totalGames > 0 ? wins / totalGames : 0.5
  const attendanceFactor = clamp(
    0.7 + 0.05 * (winPct - 0.5) * 100,
    ATTENDANCE_FACTOR_MIN,
    ATTENDANCE_FACTOR_MAX,
  )
  return Math.round(
    LOCAL_REVENUE_BASELINE * team.marketSize * (team.prestige / 100) * attendanceFactor,
  )
}

export function computeSeasonPerformanceBonus(
  seasonResult: TeamSeasonResult,
): number {
  return SEASON_PERFORMANCE_BONUS[seasonResult] ?? 0
}

export function computeTotalRevenue(finances: TeamFinances): number {
  return (
    finances.baseRevenue +
    finances.localRevenue +
    finances.seasonPerformanceBonus
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
