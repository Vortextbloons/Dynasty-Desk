import type { Rivalry } from '@/game/models/rivalry'
import type { BoxScoreResult } from '@/game/models/sim'
import { createRivalryId, emptyRivalry } from '@/game/models/rivalry'

export function updateRivalry(
  rivalries: Record<string, Rivalry>,
  teamAId: string,
  teamBId: string,
  boxScore: BoxScoreResult,
  date: string,
  isPlayoff: boolean,
): Rivalry {
  const id = createRivalryId(teamAId, teamBId)
  let rivalry = rivalries[id] ?? emptyRivalry(teamAId, teamBId)

  if (isPlayoff) {
    rivalry.playoffMeetings++
    const homeWon = (boxScore.homeScore ?? 0) > (boxScore.awayScore ?? 0)
    if (teamAId === boxScore.homeTeamId) {
      if (homeWon) rivalry.playoffWinsA++
      else rivalry.playoffWinsB++
    } else {
      if (homeWon) rivalry.playoffWinsB++
      else rivalry.playoffWinsA++
    }
  } else {
    rivalry.regularSeasonGames++
  }

  rivalry.lastMeetingDate = date
  rivalry.intensityScore = computeIntensity(rivalry)

  rivalries[id] = rivalry
  return rivalry
}

function computeIntensity(rivalry: Rivalry): number {
  let score = 0
  score += rivalry.playoffMeetings * 15
  const totalPlayoffGames = rivalry.playoffWinsA + rivalry.playoffWinsB
  if (totalPlayoffGames >= 4) {
    const diff = Math.abs(rivalry.playoffWinsA - rivalry.playoffWinsB)
    if (diff <= 2) score += 10
  }
  score += Math.min(20, rivalry.regularSeasonGames * 2)
  return Math.min(100, Math.round(score))
}

export function updateHotPlayer(
  rivalry: Rivalry,
  playerId: string,
  ppgVsOpponent: number,
): Rivalry {
  if (!rivalry.hotPlayer || ppgVsOpponent > rivalry.hotPlayer.ppgVsOpponent) {
    rivalry.hotPlayer = { playerId, ppgVsOpponent }
  }
  return rivalry
}
