import type { ShotZone, Position } from '@/game/models'
import type { PlayerTendencies } from '@/game/models/tendencies'
import type { EraConfig } from '@/game/models/eraConfig'
import type { Player } from '@/game/models/player'

export const SHOT_ZONES: readonly ShotZone[] = [
  'at_rim',
  'short_mid',
  'long_mid',
  'corner_three',
  'above_break_three',
] as const

export const BASE_ZONE_PCT: Record<ShotZone, number> = {
  at_rim: 0.65,
  short_mid: 0.42,
  long_mid: 0.39,
  corner_three: 0.39,
  above_break_three: 0.36,
}

export const ZONE_POINTS: Record<ShotZone, 2 | 3> = {
  at_rim: 2,
  short_mid: 2,
  long_mid: 2,
  corner_three: 3,
  above_break_three: 3,
}

export function isThreePointZone(zone: ShotZone): boolean {
  return zone === 'corner_three' || zone === 'above_break_three'
}

export function zoneRatingFor(player: Player, zone: ShotZone): number {
  switch (zone) {
    case 'at_rim':
      return player.ratings.insideScoring
    case 'short_mid':
      return player.ratings.closeShot
    case 'long_mid':
      return player.ratings.midrange
    case 'corner_three':
    case 'above_break_three':
      return player.ratings.threePoint
  }
}

export function zoneFrequencyFor(
  player: Player,
  zone: ShotZone,
): number {
  const t: PlayerTendencies = player.tendencies
  switch (zone) {
    case 'at_rim':
      return t.rimFrequency
    case 'short_mid':
      return t.shortMidFrequency
    case 'long_mid':
      return t.longMidFrequency
    case 'corner_three':
      return t.cornerThreeFrequency
    case 'above_break_three':
      return t.aboveBreakThreeFrequency
  }
}

export function positionFoulDrawnFactor(position: Position): number {
  switch (position) {
    case 'C':
      return 1.3
    case 'PF':
      return 1.2
    case 'SF':
      return 1.0
    case 'SG':
      return 0.9
    case 'PG':
      return 0.85
  }
}

export function threePointRateForTeam(
  teamPlayers: readonly Player[],
  era: EraConfig,
): number {
  if (teamPlayers.length === 0) return era.league3PARate
  let sum = 0
  for (const p of teamPlayers) sum += p.tendencies.threePointRate
  const tendencyAvg = sum / teamPlayers.length
  const blended = tendencyAvg * 0.6 + era.league3PARate * 0.4
  return Math.max(0.2, Math.min(0.55, blended))
}
