import type { Player } from '@/game/models/player'
import type { ShotZone } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import { clamp } from '@/lib/utils'
import {
  BASE_OREB_CHANCE,
  OREB_CLAMP_MIN,
  OREB_CLAMP_MAX,
  SHORT_REBOUND_BONUS,
  LONG_REBOUND_PENALTY,
} from '@/game/sim/simConstants'

export interface ResolvedRebound {
  playerId: string
  teamId: string
  offensive: boolean
  impact: number
}

const SHORT_REBOUND_ZONES: ReadonlySet<ShotZone> = new Set(['at_rim', 'short_mid'])

export function offensiveReboundChance(
  offense: readonly Player[],
  defense: readonly Player[],
  zone: ShotZone,
): number {
  if (offense.length === 0) return 0.25

  const offOREB =
    offense.reduce((sum, p) => sum + p.ratings.offensiveRebound, 0) /
    offense.length
  const defDREB =
    defense.length === 0
      ? 70
      : defense.reduce((sum, p) => sum + p.ratings.defensiveRebound, 0) /
        defense.length

  const ratio = (offOREB - defDREB) / 50
  let base = BASE_OREB_CHANCE + ratio * 0.05

  if (SHORT_REBOUND_ZONES.has(zone)) {
    base += SHORT_REBOUND_BONUS
  } else {
    base -= LONG_REBOUND_PENALTY
  }

  return clamp(base, OREB_CLAMP_MIN, OREB_CLAMP_MAX)
}

export function resolveRebound(
  offense: readonly Player[],
  defense: readonly Player[],
  offenseTeamId: string,
  defenseTeamId: string,
  zone: ShotZone,
  rng: SeededRandom,
): ResolvedRebound {
  const oRebChance = offensiveReboundChance(offense, defense, zone)
  const offensive = rng.chance(oRebChance)
  const pool = offensive ? offense : defense
  const teamId = offensive ? offenseTeamId : defenseTeamId

  const weights = pool.map((p) => {
    const r = offensive ? p.ratings.offensiveRebound : p.ratings.defensiveRebound
    return Math.max(1, r + p.ratings.vertical * 0.3)
  })
  const rebounder = rng.weightedPick(pool, weights)
  return {
    playerId: rebounder.id,
    teamId,
    offensive,
    impact: 30 + (offensive ? 5 : 0),
  }
}
