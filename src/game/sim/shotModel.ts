import type { Player } from '@/game/models/player'
import type { ShotZone, ShotType } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import {
  BASE_ZONE_PCT,
  ZONE_POINTS,
  zoneRatingFor,
  isThreePointZone,
} from '@/game/sim/shotZones'
import { clamp } from '@/lib/utils'

export interface ShotContext {
  shooter: Player
  defender: Player
  offenseLineup: readonly Player[]
  defenseLineup: readonly Player[]
  zone: ShotZone
  shotType: ShotType
  homeOffense: boolean
  inClosingMinutes: boolean
  shooterFatigue: boolean
}

export interface ResolvedShot {
  made: boolean
  zone: ShotZone
  shotType: ShotType
  points: 0 | 2 | 3
  assistedBy?: string
  blockedBy?: string
  impact: number
  makeChance: number
  wasPutback: boolean
  shotClockViolation: boolean
}

const CLUTCH_BONUS = 0.03
const HOME_BONUS = 0.02
const CONTEST_PENALTY_MAX = 0.18
const SPACING_BONUS_MAX = 0.06
const PASSER_BONUS_MAX = 0.05
const SHOT_QUALITY_BASE_BONUS = 0.04
const SKILL_ADJUSTMENT_RANGE = 0.18

export function makeChance(ctx: ShotContext): number {
  const base = BASE_ZONE_PCT[ctx.zone] ?? 0.4
  const shooterSkill = zoneRatingFor(ctx.shooter, ctx.zone)
  const skillAdj = ((shooterSkill - 70) / 30) * SKILL_ADJUSTMENT_RANGE

  const shotQualityAdj = shotQualityAdjustment(ctx)

  const spacingAdj = spacingAdjustment(ctx.offenseLineup, ctx.zone)
  const passerAdj = passerAdjustment(ctx)
  const contestPenalty = contestPenaltyValue(ctx)

  const fatigueAdj = ctx.shooterFatigue ? -0.05 : 0

  const clutchAdj = ctx.inClosingMinutes
    ? ((ctx.shooter.ratings.clutch - 70) / 30) * CLUTCH_BONUS
    : 0

  const homeAdj = ctx.homeOffense ? HOME_BONUS : 0

  const raw =
    base +
    skillAdj +
    shotQualityAdj +
    spacingAdj +
    passerAdj -
    contestPenalty +
    fatigueAdj +
    clutchAdj +
    homeAdj

  return clamp(raw, 0.05, 0.95)
}

function shotQualityAdjustment(ctx: ShotContext): number {
  switch (ctx.shotType) {
    case 'catch_and_shoot':
      return SHOT_QUALITY_BASE_BONUS
    case 'pull_up':
      return 0
    case 'drive':
      return 0.02
    case 'post_up':
      return -0.02
    case 'transition':
      return 0.04
    case 'putback':
      return -0.06
  }
}

function spacingAdjustment(
  offense: readonly Player[],
  zone: ShotZone,
): number {
  if (offense.length === 0) return 0
  let threePointShooters = 0
  for (const p of offense) {
    if (p.ratings.threePoint >= 70) threePointShooters++
  }
  const ratio = threePointShooters / offense.length
  const longRange = isThreePointZone(zone) ? 1.5 : 1
  return ratio * SPACING_BONUS_MAX * longRange
}

function passerAdjustment(ctx: ShotContext): number {
  if (ctx.shotType !== 'catch_and_shoot') return 0
  const passers = ctx.offenseLineup.filter(
    (p) => p.ratings.passing >= 70,
  ).length
  const ratio = passers / Math.max(1, ctx.offenseLineup.length)
  return ratio * PASSER_BONUS_MAX
}

function contestPenaltyValue(ctx: ShotContext): number {
  const def = ctx.defender.ratings
  const contest =
    def.perimeterDefense * 0.4 +
    def.interiorDefense * 0.3 +
    def.defensiveIq * 0.3
  const ratio = (contest - 60) / 40
  return clamp(ratio, 0, 1) * CONTEST_PENALTY_MAX
}

export function resolveShot(
  ctx: ShotContext,
  rng: SeededRandom,
): ResolvedShot {
  const chance = makeChance(ctx)
  const made = rng.next() < chance
  const points: 0 | 2 | 3 = made ? (ZONE_POINTS[ctx.zone] ?? 2) : 0
  const impact = computeImpact({
    made,
    zone: ctx.zone,
    shooterId: ctx.shooter.id,
  })
  return {
    made,
    zone: ctx.zone,
    shotType: ctx.shotType,
    points,
    impact,
    makeChance: chance,
    wasPutback: ctx.shotType === 'putback',
    shotClockViolation: false,
  }
}

export function computeImpact(args: {
  made: boolean
  zone: ShotZone
  shooterId: string
}): number {
  const base = 50
  const makeBonus = args.made ? 25 : 0
  const pointsBonus = args.made
    ? (ZONE_POINTS[args.zone] === 3 ? 15 : 10)
    : 0
  const deepBomb = args.made && args.zone === 'above_break_three' ? 5 : 0
  return base + makeBonus + pointsBonus + deepBomb
}

export function selectZone(
  shooter: Player,
  threePointRate: number,
  isTransition: boolean,
  rng: SeededRandom,
): ShotZone {
  const zones: ShotZone[] = isTransition
    ? ['at_rim', 'corner_three', 'above_break_three', 'at_rim', 'at_rim']
    : ['at_rim', 'short_mid', 'long_mid', 'corner_three', 'above_break_three']
  const weights: number[] = zones.map((z) => {
    const freq = zoneFrequency(shooter, z)
    if (z === 'at_rim' && isTransition) return freq * 1.8
    if (isThreePointZone(z)) {
      return freq * (0.6 + threePointRate)
    }
    return freq
  })
  return rng.weightedPick(zones, weights)
}

function zoneFrequency(player: Player, zone: ShotZone): number {
  switch (zone) {
    case 'at_rim':
      return player.tendencies.rimFrequency
    case 'short_mid':
      return player.tendencies.shortMidFrequency
    case 'long_mid':
      return player.tendencies.longMidFrequency
    case 'corner_three':
      return player.tendencies.cornerThreeFrequency
    case 'above_break_three':
      return player.tendencies.aboveBreakThreeFrequency
  }
}
