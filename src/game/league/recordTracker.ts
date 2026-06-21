import type { LeagueState } from '@/game/models/league'
import type { LeagueRecord, RecordCategory } from '@/game/models/record'
import type { BoxScoreResult, PlayerGameStats } from '@/game/models/sim'
import { createRecordId } from '@/game/models/record'

export function checkRecords(
  league: LeagueState,
  boxScore: BoxScoreResult,
  date: string,
): LeagueRecord[] {
  const newRecords: LeagueRecord[] = []

  const categories: { category: RecordCategory; getter: (s: PlayerGameStats) => number }[] = [
    { category: 'single_game_points', getter: (s) => s.points },
    { category: 'single_game_assists', getter: (s) => s.assists },
    { category: 'single_game_rebounds', getter: (s) => s.totalRebounds },
  ]

  for (const { category, getter } of categories) {
    let bestPlayerId: string | null = null
    let bestValue = 0

    for (const [playerId, stats] of Object.entries(boxScore.playerStats)) {
      const value = getter(stats)
      if (value > bestValue) {
        bestValue = value
        bestPlayerId = playerId
      }
    }

    if (bestPlayerId === null || bestValue === 0) continue

    const existing = league.records.find((r) => r.category === category)
    if (existing && bestValue <= existing.value) continue

    const teamId = boxScore.playerStats[bestPlayerId]?.teamId ?? ''
    const record: LeagueRecord = {
      id: createRecordId(category, bestPlayerId, league.seasonYear),
      category,
      playerId: bestPlayerId,
      teamId,
      value: bestValue,
      seasonYear: league.seasonYear,
      date,
      previousHolder: existing?.playerId,
    }

    newRecords.push(record)
  }

  return newRecords
}
