import type { Player } from '@/game/models/player'
import type { PlayerRatings } from '@/game/models/ratings'
import type { PlayerSeasonStat } from '@/game/models/player'
import type { TrainingFocus } from '@/game/models/training'
import type { SeededRandom } from '@/game/sim/rng'
import { clamp } from '@/lib/utils'

const RATING_KEYS: (keyof PlayerRatings)[] = [
  'insideScoring',
  'closeShot',
  'midrange',
  'threePoint',
  'freeThrow',
  'ballHandling',
  'passing',
  'offensiveIq',
  'perimeterDefense',
  'interiorDefense',
  'steal',
  'block',
  'defensiveIq',
  'speed',
  'strength',
  'vertical',
  'stamina',
  'durability',
]

function ageGrowthBand(age: number): { min: number; max: number } {
  if (age <= 22) return { min: 0.5, max: 2.0 }
  if (age <= 26) return { min: 0, max: 1.0 }
  if (age <= 31) return { min: -0.5, max: 0.5 }
  return { min: -2.0, max: -0.5 }
}

function focusRatings(focus: TrainingFocus): (keyof PlayerRatings)[] {
  switch (focus) {
    case 'shooting':
      return ['threePoint', 'midrange', 'closeShot', 'freeThrow']
    case 'defense':
      return ['perimeterDefense', 'interiorDefense', 'steal', 'block', 'defensiveIq']
    case 'playmaking':
      return ['ballHandling', 'passing', 'offensiveIq']
    case 'strength':
      return ['strength', 'interiorDefense', 'offensiveRebound', 'defensiveRebound']
    case 'conditioning':
      return ['stamina', 'durability', 'speed']
    case 'rehab':
      return ['durability', 'stamina']
    default:
      return []
  }
}

export interface DevelopmentContext {
  trainingFocus: TrainingFocus
  teamFocus: TrainingFocus
  minutesPerGame: number
  majorInjuries: number
  morale: number
}

export function endOfSeasonDevelopment(
  player: Player,
  seasonStats: PlayerSeasonStat,
  ctx: DevelopmentContext,
  rng: SeededRandom,
): { ratings: PlayerRatings; ratingsDelta: Record<string, number> } {
  const band = ageGrowthBand(player.age)
  const curveMult =
    player.development.progressionCurve === 'early'
      ? 1.2
      : player.development.progressionCurve === 'late'
        ? 0.85
        : player.development.progressionCurve === 'veteran_decline'
          ? 1.3
          : 1

  let ovrDelta = band.min + rng.next() * (band.max - band.min)
  ovrDelta *= curveMult

  const workCoach =
    ((player.traits.workEthic + player.traits.coachability) / 200 - 0.5) * 1
  ovrDelta += workCoach

  const minutesFactor = clamp(seasonStats.gamesPlayed > 0
    ? seasonStats.minutes / seasonStats.gamesPlayed / 36
    : 0.5, 0.3, 1.2)
  ovrDelta *= 0.7 + minutesFactor * 0.3

  ovrDelta -= ctx.majorInjuries * 0.5
  ovrDelta += (ctx.morale - 50) / 100

  if (rng.chance(player.development.bustRisk) && player.age <= 24) {
    ovrDelta -= 0.5 + rng.next()
  }
  if (rng.chance(player.development.breakoutChance) && player.age <= 26) {
    ovrDelta += 0.5 + rng.next() * 1.5
  }

  const focus = ctx.trainingFocus !== 'balanced' ? ctx.trainingFocus : ctx.teamFocus
  const focusedKeys = focusRatings(focus)
  const ratingsDelta: Record<string, number> = {}
  const newRatings = { ...player.ratings }

  for (const key of RATING_KEYS) {
    if (key === 'overall' || key === 'potential' || key === 'clutch' || key === 'consistency') {
      continue
    }
    let delta = (ovrDelta / RATING_KEYS.length) * (0.5 + rng.next())
    if (focusedKeys.includes(key)) {
      delta += 0.3
    }
    if (key === 'speed' || key === 'vertical') {
      if (player.age >= 30) delta -= 0.3
    }
    if (key === 'threePoint' || key === 'freeThrow') {
      if (player.age >= 28) delta += 0.1
    }
    delta = Math.round(delta * 10) / 10
    if (Math.abs(delta) < 0.1) continue
    const current = newRatings[key] as number
    const next = clamp(Math.round(current + delta), 25, 99)
    ratingsDelta[key] = next - current
    ;(newRatings as Record<string, number>)[key] = next
  }

  return { ratings: newRatings, ratingsDelta }
}

export function trainingFocusPreview(focus: TrainingFocus): string {
  const keys = focusRatings(focus)
  if (keys.length === 0) return 'Balanced growth across all skills'
  return `Expect ~+0.3 to ${keys.slice(0, 2).join(', ')} next season`
}
