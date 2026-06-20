import type { Player } from '@/game/models/player'
import type { PlayerSeasonStat } from '@/game/models/player'
import type { PlayerGameStats } from '@/game/models/sim'

function emptySeasonStat(season: string, teamId: string | null): PlayerSeasonStat {
  return {
    season,
    teamId,
    gamesPlayed: 0,
    minutes: 0,
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    plusMinus: 0,
  }
}

export function mergeBoxScoreIntoSeasonStats(
  player: Player,
  line: PlayerGameStats,
  seasonLabel: string,
): void {
  if (line.minutes <= 0) return

  if (player.seasonStats.season !== seasonLabel) {
    player.seasonStats = emptySeasonStat(seasonLabel, player.teamId)
  }

  const stats = player.seasonStats
  stats.teamId = player.teamId
  stats.gamesPlayed += 1
  stats.minutes += line.minutes
  stats.points += line.points
  stats.rebounds += line.totalRebounds
  stats.assists += line.assists
  stats.steals += line.steals
  stats.blocks += line.blocks
  stats.turnovers += line.turnovers
  stats.fieldGoalsMade += line.fgm
  stats.fieldGoalsAttempted += line.fga
  stats.threePointersMade += line.tpm
  stats.threePointersAttempted += line.tpa
  stats.freeThrowsMade += line.ftm
  stats.freeThrowsAttempted += line.fta
  stats.plusMinus += line.plusMinus
}
