import type { PlayoffBracket } from '@/game/models/playoff'
import type { ScheduledGame } from '@/game/models/game'

export interface FinalsMvpCandidate {
  playerId: string
  teamId: string
  totalPoints: number
  totalRebounds: number
  totalAssists: number
  totalMinutes: number
  combinedStat: number
}

export function computeFinalsMvp(
  bracket: PlayoffBracket,
  games: Record<string, ScheduledGame>,
): string | null {
  const finals = bracket.finals
  if (!finals || finals.status !== 'final') return null

  const finalsGames = finals.games
    .map((id) => games[id])
    .filter((g): g is ScheduledGame => g?.status === 'final')

  if (finalsGames.length === 0) return null

  const playerTotals = new Map<string, {
    teamId: string
    points: number
    rebounds: number
    assists: number
    minutes: number
  }>()

  for (const game of finalsGames) {
    if (!game.boxScore) continue
    const boxScore = game.boxScore

    for (const [playerId, stats] of Object.entries(boxScore.playerStats)) {
      const existing = playerTotals.get(playerId)
      if (existing) {
        existing.points += stats.points
        existing.rebounds += stats.totalRebounds
        existing.assists += stats.assists
        existing.minutes += stats.minutes
      } else {
        playerTotals.set(playerId, {
          teamId: stats.teamId,
          points: stats.points,
          rebounds: stats.totalRebounds,
          assists: stats.assists,
          minutes: stats.minutes,
        })
      }
    }
  }

  let bestPlayer: string | null = null
  let bestScore = -1
  let bestMinutes = -1

  for (const [playerId, totals] of playerTotals) {
    const combined = totals.points + totals.rebounds + totals.assists
    if (
      combined > bestScore ||
      (combined === bestScore && totals.minutes > bestMinutes)
    ) {
      bestScore = combined
      bestMinutes = totals.minutes
      bestPlayer = playerId
    }
  }

  return bestPlayer
}

export function getCandidatesForFinals(
  bracket: PlayoffBracket,
  games: Record<string, ScheduledGame>,
): FinalsMvpCandidate[] {
  const finals = bracket.finals
  if (!finals || finals.status !== 'final') return []

  const finalsGames = finals.games
    .map((id) => games[id])
    .filter((g): g is ScheduledGame => g?.status === 'final')

  const playerTotals = new Map<string, {
    teamId: string
    points: number
    rebounds: number
    assists: number
    minutes: number
  }>()

  for (const game of finalsGames) {
    if (!game.boxScore) continue

    for (const [playerId, stats] of Object.entries(game.boxScore.playerStats)) {
      const existing = playerTotals.get(playerId)
      if (existing) {
        existing.points += stats.points
        existing.rebounds += stats.totalRebounds
        existing.assists += stats.assists
        existing.minutes += stats.minutes
      } else {
        playerTotals.set(playerId, {
          teamId: stats.teamId,
          points: stats.points,
          rebounds: stats.totalRebounds,
          assists: stats.assists,
          minutes: stats.minutes,
        })
      }
    }
  }

  return Array.from(playerTotals.entries())
    .map(([playerId, t]) => ({
      playerId,
      teamId: t.teamId,
      totalPoints: t.points,
      totalRebounds: t.rebounds,
      totalAssists: t.assists,
      totalMinutes: t.minutes,
      combinedStat: t.points + t.rebounds + t.assists,
    }))
    .sort((a, b) => {
      if (b.combinedStat !== a.combinedStat) return b.combinedStat - a.combinedStat
      return b.totalMinutes - a.totalMinutes
    })
}
