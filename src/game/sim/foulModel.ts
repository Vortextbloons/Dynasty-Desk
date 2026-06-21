import type { Player } from '@/game/models/player'
import type { ShotZone } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import { positionFoulDrawnFactor } from '@/game/sim/shotZones'
import { clamp } from '@/lib/utils'
import {
  SHOOTING_FOUL_BASE,
  SHOOTING_FOUL_CLAMP_MIN,
  SHOOTING_FOUL_CLAMP_MAX,
  NON_SHOOTING_FOUL_BASE,
  NON_SHOOTING_FOUL_CLAMP_MIN,
  NON_SHOOTING_FOUL_CLAMP_MAX,
  OFFENSIVE_FOUL_BASE,
  OFFENSIVE_FOUL_CLAMP_MIN,
  OFFENSIVE_FOUL_CLAMP_MAX,
  FLAGRANT_CHANCE,
  TECHNICAL_CHANCE,
} from '@/game/sim/simConstants'

export type ResolvedFoulKind = 'shooting' | 'non_shooting' | 'offensive' | 'flagrant' | 'technical'

export interface ResolvedFoul {
  kind: ResolvedFoulKind
  onShot: boolean
  playerId: string
  fouledPlayerId?: string
  isEjection?: boolean
}

export function shootingFoulChance(
  offense: Player,
  defender: Player,
  zone: ShotZone,
): number {
  const tendency = offense.tendencies.foulRate / 100
  const ftRate = offense.tendencies.freeThrowRate / 100
  const zoneFactor = zone === 'at_rim' ? 1.4 : zone.endsWith('three') ? 0.7 : 1
  const positionFactor = positionFoulDrawnFactor(offense.position)
  const defenderDiscipline = 1 - (defender.ratings.defensiveIq - 50) / 200

  const raw =
    SHOOTING_FOUL_BASE +
    (tendency * 0.12 + ftRate * 0.05 + positionFactor * 0.04) * zoneFactor * defenderDiscipline

  return clamp(raw, SHOOTING_FOUL_CLAMP_MIN, SHOOTING_FOUL_CLAMP_MAX)
}

export function nonShootingFoulChance(defender: Player): number {
  const physicality = (defender.ratings.strength - 50) / 50
  const iq = (defender.ratings.defensiveIq - 50) / 100
  const raw = NON_SHOOTING_FOUL_BASE + physicality * 0.04 - iq * 0.02
  return clamp(raw, NON_SHOOTING_FOUL_CLAMP_MIN, NON_SHOOTING_FOUL_CLAMP_MAX)
}

export function offensiveFoulChance(offense: Player): number {
  const discipline = (offense.ratings.offensiveIq - 50) / 100
  const raw = OFFENSIVE_FOUL_BASE - discipline * 0.02
  return clamp(raw, OFFENSIVE_FOUL_CLAMP_MIN, OFFENSIVE_FOUL_CLAMP_MAX)
}

export function resolveFoul(
  defender: Player,
  offense: Player,
  onShot: boolean,
  rng: SeededRandom,
): ResolvedFoul {
  if (onShot) {
    if (rng.chance(FLAGRANT_CHANCE)) {
      return {
        kind: 'flagrant',
        onShot: true,
        playerId: defender.id,
        fouledPlayerId: offense.id,
      }
    }
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

  if (rng.chance(FLAGRANT_CHANCE)) {
    return {
      kind: 'flagrant',
      onShot: false,
      playerId: defender.id,
      fouledPlayerId: offense.id,
    }
  }

  return {
    kind: 'non_shooting',
    onShot: false,
    playerId: defender.id,
    fouledPlayerId: offense.id,
  }
}

export function resolveTechnical(rng: SeededRandom, playerIds: string[]): ResolvedFoul | null {
  if (!rng.chance(TECHNICAL_CHANCE)) return null
  const playerId = rng.pick(playerIds)
  return {
    kind: 'technical',
    onShot: false,
    playerId,
  }
}

export function isFlagrantEjection(flagrantCount: number): boolean {
  return flagrantCount >= 2
}

export function isTechnicalEjection(technicalCount: number): boolean {
  return technicalCount >= 2
}
