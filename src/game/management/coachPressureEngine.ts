import type { Team } from '@/game/models/team'
import type { LeagueState } from '@/game/models/league'

export type PressureLevel = 'low' | 'medium' | 'high'

export function evaluateCoachPressure(
  team: Team,
  league: LeagueState,
): PressureLevel {
  const standing = league.standings[team.id]
  if (!standing) return 'low'

  const wins = standing.wins
  const losses = standing.losses
  const total = wins + losses
  if (total === 0) return 'low'

  const winPct = wins / total
  const sorted = Object.values(league.standings).sort((a, b) => b.wins - a.wins)
  const rank = sorted.findIndex((s) => s.teamId === team.id) + 1

  if (rank <= 8 && winPct >= 0.55) return 'low'
  if (rank > 20 && winPct < 0.35) return 'high'
  if (rank > 14 || winPct < 0.40) return 'medium'
  return 'low'
}
