import type { Player } from '@/game/models/player'
import type { ShotZone } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import { positionFoulDrawnFactor } from '@/game/sim/shotZones'
import { clamp } from '@/lib/utils'

export type ResolvedFoulKind = 'shooting' | 'non_shooting' | 'offensive'

export interface ResolvedFoul {
  kind: ResolvedFoulKind
  onShot: boolean
  playerId: string
  fouledPlayerId?: string
}

export function shootingFoulChance(
  offense: Player,
  defender: Player,
  zone: ShotZone,
): number {
  void zone
  const tendency = offense.tendencies.foulRate / 100
  const ftRate = offense.tendencies.freeThrowRate / 100
  const zoneFactor = zone === 'at_rim' ? 1.4 : zone.endsWith('three') ? 0.7 : 1
  const positionFactor = positionFoulDrawnFactor(offense.position)
  const defenderDiscipline = 1 - (defender.ratings.defensiveIq - 50) / 200

  const raw =
    0.04 +
    (tendency * 0.12 + ftRate * 0.05 + positionFactor * 0.04) * zoneFactor * defenderDiscipline

  return clamp(raw, 0.02, 0.25)
}

export function nonShootingFoulChance(defender: Player): number {
  const physicality = (defender.ratings.strength - 50) / 50
  const iq = (defender.ratings.defensiveIq - 50) / 100
  const raw = 0.05 + physicality * 0.04 - iq * 0.02
  return clamp(raw, 0.02, 0.15)
}

export function offensiveFoulChance(offense: Player): number {
  const discipline = (offense.ratings.offensiveIq - 50) / 100
  const raw = 0.04 - discipline * 0.02
  return clamp(raw, 0.01, 0.08)
}

export function resolveFoul(
  defender: Player,
  offense: Player,
  onShot: boolean,
  rng: SeededRandom,
): ResolvedFoul {
  if (onShot) {
    return {
      kind: 'shooting',
      onShot: true,
      playerId: defender.id,
      fouledPlayerId: offense.id,
    }
  }

  const offChance = offensiveFoulChance(offense)
  if (rng.chance(offChance)) {
    return {
      kind: 'offensive',
      onShot: false,
      playerId: offense.id,
    }
  }

  return {
    kind: 'non_shooting',
    onShot: false,
    playerId: defender.id,
    fouledPlayerId: offense.id,
  }
}
