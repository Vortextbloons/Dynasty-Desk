import type { Player } from '@/game/models/player'
import type { InjuryRecord, InjurySeverity, InjuryType } from '@/game/models/injury'
import type { PlayerHealth } from '@/game/models/player'
import type { SeededRandom } from '@/game/sim/rng'
import { clamp } from '@/lib/utils'

const BODY_PARTS = ['knee', 'ankle', 'hamstring', 'back', 'shoulder', 'wrist', 'groin', 'calf']

export interface InjuryRollContext {
  minutes: number
  fatigue: number
  contact: boolean
  backToBack: boolean
  injuriesEnabled: boolean
}

function severityToHealthStatus(severity: InjurySeverity): PlayerHealth['status'] {
  switch (severity) {
    case 'minor':
    case 'day_to_day':
      return 'day_to_day'
    case 'short_term':
      return 'short_term'
    case 'long_term':
      return 'long_term'
    case 'season_ending':
      return 'season_ending'
  }
}

function daysForSeverity(severity: InjurySeverity, rng: SeededRandom): number {
  switch (severity) {
    case 'minor':
      return 1 + Math.floor(rng.next() * 2)
    case 'day_to_day':
      return 2 + Math.floor(rng.next() * 4)
    case 'short_term':
      return 7 + Math.floor(rng.next() * 21)
    case 'long_term':
      return 30 + Math.floor(rng.next() * 150)
    case 'season_ending':
      return 200 + Math.floor(rng.next() * 82)
  }
}

function gamesForDays(days: number): number {
  return Math.max(1, Math.ceil(days / 2.5))
}

export function injuryChance(player: Player, ctx: InjuryRollContext): number {
  if (!ctx.injuriesEnabled || player.health.status === 'season_ending') return 0

  let chance = 0.005
  const durability = player.ratings.durability / 100
  chance *= 1.4 - durability * 0.8

  if (ctx.fatigue > 70) chance *= 1.5
  if (ctx.minutes > 38) chance *= 1.3
  if (ctx.backToBack) chance *= 1.2
  if (player.age >= 32) chance *= 1.15
  chance += (player.traits.injuryRisk - 50) / 10000

  return clamp(chance, 0.001, 0.03)
}

export function rollInjurySeverity(rng: SeededRandom): InjurySeverity {
  const roll = rng.next()
  if (roll < 0.6) return rng.chance(0.5) ? 'minor' : 'day_to_day'
  if (roll < 0.85) return 'short_term'
  if (roll < 0.97) return 'long_term'
  return 'season_ending'
}

export function rollForInjury(
  player: Player,
  ctx: InjuryRollContext,
  rng: SeededRandom,
  date: string,
): InjuryRecord | null {
  if (!rng.chance(injuryChance(player, ctx))) return null

  const severity = rollInjurySeverity(rng)
  const bodyPart = BODY_PARTS[Math.floor(rng.next() * BODY_PARTS.length)]!
  const type: InjuryType = ctx.contact
    ? 'contact'
    : ctx.fatigue > 75
      ? 'fatigue'
      : ctx.minutes > 36
        ? 'overuse'
        : 'non_contact'
  const daysOut = daysForSeverity(severity, rng)

  return {
    id: crypto.randomUUID(),
    date,
    type,
    bodyPart,
    severity,
    daysOut,
  }
}

export function applyInjuryToHealth(
  health: PlayerHealth,
  injury: InjuryRecord,
): PlayerHealth {
  const status = severityToHealthStatus(injury.severity)
  const gamesRemaining = gamesForDays(injury.daysOut)
  return {
    ...health,
    status,
    injuryDescription: `${injury.bodyPart}: ${injury.severity.replace('_', ' ')}`,
    daysRemaining: injury.daysOut,
    gamesRemaining,
    injuryHistory: [...health.injuryHistory, injury],
  }
}

export function processRecovery(
  health: PlayerHealth,
  gamesPlayedSinceLastCheck = 1,
): PlayerHealth {
  if (health.status === 'healthy') return health

  const gamesRemaining = Math.max(0, health.gamesRemaining - gamesPlayedSinceLastCheck)
  const daysRemaining = Math.max(0, health.daysRemaining - gamesPlayedSinceLastCheck * 2)

  if (gamesRemaining <= 0 && daysRemaining <= 0) {
    const history = [...health.injuryHistory]
    const last = history[history.length - 1]
    if (last && !last.recoveredAt) {
      history[history.length - 1] = {
        ...last,
        recoveredAt: new Date().toISOString(),
      }
    }
    return {
      status: 'healthy',
      injuryDescription: null,
      daysRemaining: 0,
      gamesRemaining: 0,
      injuryHistory: history,
    }
  }

  return {
    ...health,
    gamesRemaining,
    daysRemaining,
    status:
      gamesRemaining <= 2 && health.status !== 'season_ending'
        ? 'day_to_day'
        : health.status,
  }
}
