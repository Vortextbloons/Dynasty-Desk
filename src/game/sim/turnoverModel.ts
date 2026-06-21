import type { Player } from '@/game/models/player'
import type { TurnoverType } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import { clamp } from '@/lib/utils'
import { TURNOVER_IMPACT, STEAL_PROBABILITY_ON_TO, STEAL_THRESHOLD } from '@/game/sim/simConstants'

export interface ResolvedTurnover {
  turnoverType: TurnoverType
  playerId: string
  stolenBy?: string
  impact: number
  isStolen: boolean
}

export function turnoverChance(
  ballHandler: Player,
  defense: readonly Player[],
): number {
  const tendency = ballHandler.tendencies.turnoverRate / 100
  const handling = (ballHandler.ratings.ballHandling - 50) / 50
  const passing = (ballHandler.ratings.passing - 50) / 100

  let defensivePressure = 0
  for (const d of defense) {
    defensivePressure +=
      (d.ratings.perimeterDefense * 0.5 +
        d.ratings.steal * 0.3 +
        d.ratings.defensiveIq * 0.2) /
      100
  }
  defensivePressure = defense.length === 0 ? 0 : defensivePressure / defense.length

  const raw =
    0.05 +
    tendency * 0.18 +
    defensivePressure * 0.18 -
    handling * 0.06 -
    passing * 0.03

  return clamp(raw, 0.05, 0.3)
}

export function resolveTurnover(
  ballHandler: Player,
  defense: readonly Player[],
  rng: SeededRandom,
): ResolvedTurnover {
  const isStolen = rng.chance(STEAL_PROBABILITY_ON_TO)
  let stolenBy: string | undefined
  if (isStolen && defense.length > 0) {
    const stealers = defense.filter((d) => d.ratings.steal >= STEAL_THRESHOLD)
    const pool = stealers.length > 0 ? stealers : defense
    const weights = pool.map((d) => Math.max(1, d.ratings.steal))
    stolenBy = rng.weightedPick(pool, weights).id
  }

  const types: TurnoverType[] = isStolen
    ? ['lost_ball', 'bad_pass', 'bad_pass', 'travel']
    : ['bad_pass', 'lost_ball', 'travel', 'offensive_foul', 'shot_clock_violation', 'out_of_bounds', 'three_second_violation']
  const weights = types.map((t) => {
    switch (t) {
      case 'bad_pass':
        return 30
      case 'lost_ball':
        return 25
      case 'travel':
        return 12
      case 'offensive_foul':
        return 8
      case 'shot_clock_violation':
        return 5
      case 'out_of_bounds':
        return 12
      case 'three_second_violation':
        return 8
    }
  })
  const turnoverType = rng.weightedPick(types, weights)

  return {
    turnoverType,
    playerId: ballHandler.id,
    stolenBy,
    impact: TURNOVER_IMPACT,
    isStolen,
  }
}
