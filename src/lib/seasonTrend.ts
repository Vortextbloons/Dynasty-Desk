import type { ScheduledGame } from '@/game/models/game'

export interface SeasonTrendPoint {
  label: string
  wins: number
  losses: number
  ppg: number
}

export function buildTeamSeasonTrend(
  teamId: string,
  games: Record<string, ScheduledGame | undefined>,
): SeasonTrendPoint[] {
  const teamGames = Object.values(games)
    .filter(
      (g): g is ScheduledGame =>
        g != null &&
        g.status === 'final' &&
        (g.homeTeamId === teamId || g.awayTeamId === teamId),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  let wins = 0
  let losses = 0
  let totalPoints = 0
  const points: SeasonTrendPoint[] = []

  for (const g of teamGames) {
    const box = g.boxScore
    if (!box) continue
    const isHome = g.homeTeamId === teamId
    const teamScore = isHome ? box.homeScore : box.awayScore
    const oppScore = isHome ? box.awayScore : box.homeScore
    if (teamScore > oppScore) wins++
    else losses++
    totalPoints += teamScore
    const gamesPlayed = wins + losses
    points.push({
      label: `G${gamesPlayed}`,
      wins,
      losses,
      ppg: Math.round((totalPoints / gamesPlayed) * 10) / 10,
    })
  }

  return points
}
