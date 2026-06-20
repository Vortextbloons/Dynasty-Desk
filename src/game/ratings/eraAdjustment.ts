import type { EraConfig } from '@/game/models/eraConfig'
import { MODERN_ERA_CONFIG } from '@/game/models/eraConfig'
import {
  perGame,
  type PlayerSeasonStats,
} from '@/game/models/playerSeasonStats'

export interface EraNormalizedStats {
  ppg: number
  rpg: number
  apg: number
  spg: number
  bpg: number
  topg: number
  tsPct: number
  efgPct: number
  threePARate: number
  threePct: number
  ftPct: number
  usageRate: number
  minutesPerGame: number
  per: number
  winShares: number
  boxPlusMinus: number
  vorp: number
}

const MODERN_3PA_RATE = MODERN_ERA_CONFIG.league3PARate
const MODERN_PPG = MODERN_ERA_CONFIG.leaguePpg
const MODERN_PACE = MODERN_ERA_CONFIG.pace

export function normalizeStats(
  stats: PlayerSeasonStats,
  era: EraConfig,
): EraNormalizedStats {
  const raw = perGame(stats)
  const safeFGA = Math.max(1, stats.fga)
  const threePARate = stats.tpa / safeFGA
  const threePct = stats.tpa > 0 ? stats.tpm / stats.tpa : 0
  const ftPct = stats.fta > 0 ? stats.ftm / stats.fta : 0

  return {
    ppg: raw.ppg * (MODERN_PPG / Math.max(1, era.leaguePpg)),
    rpg: raw.rpg,
    apg: raw.apg,
    spg: raw.spg,
    bpg: raw.bpg,
    topg: raw.topg,
    tsPct: stats.tsPct > 0 ? stats.tsPct : 0,
    efgPct: stats.efgPct > 0 ? stats.efgPct : 0,
    threePARate:
      threePARate * (MODERN_3PA_RATE / Math.max(0.01, era.league3PARate)),
    threePct,
    ftPct,
    usageRate: stats.usageRate,
    minutesPerGame: raw.mpg,
    per: stats.per,
    winShares: stats.winShares,
    boxPlusMinus: stats.boxPlusMinus,
    vorp: stats.vorp,
  }
}

export function paceNormalize(value: number, era: EraConfig): number {
  return value * (MODERN_PACE / Math.max(1, era.pace))
}

export function tsAdjustment(stats: PlayerSeasonStats, era: EraConfig): number {
  if (stats.tsPct <= 0 || era.leagueTsPct <= 0) return 0
  return (stats.tsPct - era.leagueTsPct) * 100
}

export function eraCoefficient(era: EraConfig): number {
  return era.possessionCoefficient
}

export function normalizePPG(ppg: number, era: EraConfig): number {
  return ppg * (MODERN_PPG / Math.max(1, era.leaguePpg))
}
