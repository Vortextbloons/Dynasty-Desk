import type { ScheduledGame } from '@/game/models/game'

export interface TeamStreak {
  wins: number
  losses: number
}

export function computeTeamStreak(
  games: Record<string, ScheduledGame>,
  teamId: string,
): TeamStreak {
  const recent = Object.values(games)
    .filter(
      (g): g is ScheduledGame =>
        g?.status === 'final' &&
        (g.homeTeamId === teamId || g.awayTeamId === teamId),
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  let wins = 0
  let losses = 0
  for (const g of recent) {
    const won =
      (g.homeTeamId === teamId && (g.homeScore ?? 0) > (g.awayScore ?? 0)) ||
      (g.awayTeamId === teamId && (g.awayScore ?? 0) > (g.homeScore ?? 0))
    if (wins > 0 && won) {
      wins++
      continue
    }
    if (losses > 0 && !won) {
      losses++
      continue
    }
    if (won) wins = 1
    else losses = 1
    if (wins > 0 && losses > 0) break
  }
  return { wins, losses }
}
