import {
  emptyTendencies,
  type PlayerTendencies,
} from '@/game/models/tendencies'
import { getEraConfig } from '@/game/models/eraConfig'
import { normalizeStats } from './eraAdjustment'
import type { PlayerSeasonStats } from '@/game/models/playerSeasonStats'
import type { Position } from '@/game/models/position'

export function generateTendencies(
  stats: PlayerSeasonStats[],
  position: Position,
  season: string,
): PlayerTendencies {
  const base = emptyTendencies()
  const recent = stats[stats.length - 1]
  if (!recent) return base
  const era = getEraConfig(season)
  const norm = normalizeStats(recent, era)

  const safeFGA = Math.max(1, recent.fga)
  const threePARate = recent.tpa / safeFGA
  const rimRate = clamp(0.3 - threePARate * 0.5, 0.05, 0.6)
  const shortMidRate = clamp(0.15, 0.05, 0.3)
  const longMidRate = clamp(0.1, 0.02, 0.25)
  const aboveBreakRate = clamp(threePARate * 0.8, 0.05, 0.5)
  const cornerRate = clamp(threePARate * 0.2, 0.02, 0.2)

  const usageBoost = (norm.usageRate - 18) * 0.7
  const isBig = position === 'C' || position === 'PF'

  return {
    ...base,
    usageRate: clamp(norm.usageRate, 10, 40),
    passRate: clamp(
      15 + (position === 'PG' ? 12 : 0) - usageBoost * 0.2,
      5,
      40,
    ),
    shotRate: clamp(25 + usageBoost * 0.4, 15, 50),
    driveRate: clamp(
      10 +
        (position === 'PG' ? 12 : 0) +
        (position === 'SG' ? 5 : 0) -
        (isBig ? 8 : 0),
      2,
      35,
    ),
    postUpRate: clamp(5 + (isBig ? 10 : 0), 0, 30),
    rimFrequency: rimRate * 100,
    shortMidFrequency: shortMidRate * 100,
    longMidFrequency: longMidRate * 100,
    cornerThreeFrequency: cornerRate * 100,
    aboveBreakThreeFrequency: aboveBreakRate * 100,
    threePointRate: clamp(threePARate * 100, 5, 70),
    freeThrowRate:
      clamp(0.2 + safeFGA > 0 ? recent.fta / safeFGA : 0.2, 0.05, 0.6) * 100,
    turnoverRate: clamp(0.12 + (norm.topg - 1.5) * 0.04, 0.05, 0.3) * 100,
    isolationRate: clamp(10 + (norm.usageRate - 18) * 0.3, 0, 40),
    pickAndRollBallHandlerRate: clamp(
      20 + (position === 'PG' ? 20 : 0) - (isBig ? 5 : 0),
      5,
      55,
    ),
    pickAndRollRollManRate: clamp(10 + (isBig ? 15 : 0), 0, 30),
    spotUpRate: clamp(20 - (norm.usageRate - 18) * 0.4, 5, 40),
    transitionRate: clamp(15 + (norm.per - 15) * 0.3, 5, 30),
    cutRate: clamp(10 + (isBig ? 4 : 0), 0, 25),
    foulRate: clamp(2 + (norm.minutesPerGame - 25) * 0.05, 0, 6),
    stealAttemptRate: clamp(5 + norm.spg * 0.8, 0, 12),
    blockAttemptRate: clamp(5 + norm.bpg * 1.0, 0, 12),
    crashOffensiveGlassRate: clamp(10 + (isBig ? 10 : 0), 0, 30),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
