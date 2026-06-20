import type { Team } from '@/game/models/team'
import type { Player } from '@/game/models/player'
import { clamp } from '@/lib/utils'

export interface ChemistryContext {
  wins: number
  losses: number
  recentTrades: number
  continuity: number
  egoConflicts: number
  winStreak: number
  loseStreak: number
}

export function rosterContinuity(
  team: Team,
  players: Record<string, Player>,
  seasonsTogether = 1,
): number {
  const roster = team.roster
    .map((id) => players[id])
    .filter((p): p is Player => Boolean(p))
  if (roster.length === 0) return 50

  const avgLoyalty =
    roster.reduce((sum, p) => sum + p.traits.loyalty, 0) / roster.length
  const tenureBonus = Math.min(20, seasonsTogether * 4)
  return clamp(50 + (avgLoyalty - 50) * 0.3 + tenureBonus, 0, 100)
}

export function egoConflictScore(
  team: Team,
  players: Record<string, Player>,
): number {
  const roster = team.roster
    .map((id) => players[id])
    .filter((p): p is Player => Boolean(p))
  if (roster.length < 2) return 0

  const highEgo = roster.filter((p) => p.traits.ego >= 75)
  if (highEgo.length < 2) return 0
  return Math.min(30, highEgo.length * 8)
}

export function updateChemistry(
  current: number,
  ctx: ChemistryContext,
): number {
  let chemistry = current
  const total = ctx.wins + ctx.losses
  if (total > 0) {
    chemistry += (ctx.wins / total - 0.5) * 25
  }

  chemistry += (ctx.continuity - 50) * 0.15
  chemistry -= ctx.recentTrades * 8
  chemistry -= ctx.egoConflicts * 0.5

  if (ctx.winStreak >= 5) chemistry += 5
  if (ctx.loseStreak >= 5) chemistry -= 6

  return clamp(chemistry, 0, 100)
}

export function chemistryTradePenalty(tradeMagnitude: number): number {
  return clamp(tradeMagnitude * 12, 8, 25)
}

export function chemistryRecoveryGames(tradeMagnitude: number, winPct: number): number {
  const base = 10 + tradeMagnitude * 15
  const winFactor = winPct >= 0.6 ? 0.7 : winPct >= 0.5 ? 1 : 1.3
  return Math.round(base * winFactor)
}

export function chemistryEffects(chemistry: number): {
  transitionBonus: number
  ballMovementBonus: number
  clutchBonus: number
} {
  const norm = (chemistry - 50) / 50
  return {
    transitionBonus: norm * 0.04,
    ballMovementBonus: norm * 0.03,
    clutchBonus: norm * 0.02,
  }
}
