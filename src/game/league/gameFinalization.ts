import type { GameSave } from '@/game/models/save'
import type { ScheduledGame } from '@/game/models/game'
import type { BoxScoreResult } from '@/game/models/sim'
import { recomputeStandings } from '@/game/league/standingsEngine'
import { mergeBoxScoreIntoSeasonStats } from '@/game/league/seasonStatsEngine'
import {
  processPostGame,
  recoverFatigueBetweenGames,
  type PostGameResult,
} from '@/game/sim/postGameProcessor'
import { processRecovery } from '@/game/sim/injuryEngine'
import type { SeededRandom } from '@/game/sim/rng'
import { addDays, daysBetween } from '@/lib/utils'

export interface SimSessionState {
  lastFatigueRecoveryDate: string
}

export function createSimSessionState(save: GameSave): SimSessionState {
  return { lastFatigueRecoveryDate: save.league.currentDate }
}

export function computeBackToBackTeams(
  games: Record<string, ScheduledGame>,
  homeTeamId: string,
  awayTeamId: string,
  gameDate: string,
): Set<string> {
  const prevDate = addDays(gameDate, -1)
  const backToBack = new Set<string>()
  for (const g of Object.values(games)) {
    if (!g || g.status !== 'final' || g.date !== prevDate) continue
    if (g.homeTeamId === homeTeamId || g.awayTeamId === homeTeamId) {
      backToBack.add(homeTeamId)
    }
    if (g.homeTeamId === awayTeamId || g.awayTeamId === awayTeamId) {
      backToBack.add(awayTeamId)
    }
  }
  return backToBack
}

export function applyInjuryRecoveryForTeams(
  league: GameSave['league'],
  teamIds: string[],
): void {
  const ids = new Set(teamIds)
  for (const player of Object.values(league.players)) {
    if (!player?.teamId || !ids.has(player.teamId)) continue
    if (player.health.status === 'healthy') continue
    player.health = processRecovery(player.health, 1)
  }
}

export function prepareGameDay(
  save: GameSave,
  game: ScheduledGame,
  session: SimSessionState,
): void {
  const league = save.league

  if (save.settings.fatigue && game.date > session.lastFatigueRecoveryDate) {
    const days = daysBetween(session.lastFatigueRecoveryDate, game.date)
    if (days > 0) {
      recoverFatigueBetweenGames(league, days)
    }
    session.lastFatigueRecoveryDate = game.date
  }

  if (save.settings.injuries) {
    applyInjuryRecoveryForTeams(league, [game.homeTeamId, game.awayTeamId])
  }
}

export function finalizeSimulatedGame(
  save: GameSave,
  game: ScheduledGame,
  boxScore: BoxScoreResult,
  gameFatigue: Record<string, number>,
  minutesPlayed: Record<string, number>,
  rng: SeededRandom,
): PostGameResult {
  const league = save.league

  game.status = 'final'
  game.homeScore = boxScore.homeScore
  game.awayScore = boxScore.awayScore
  game.boxScore = boxScore
  game.boxScoreId = game.id
  game.winnerTeamId = boxScore.homeWin ? game.homeTeamId : game.awayTeamId
  if (boxScore.overtimeOccurred) {
    game.ot = true
  }

  const seasonLabel = league.rules.seasonLabel
  for (const [playerId, line] of Object.entries(boxScore.playerStats)) {
    const player = league.players[playerId]
    if (!player) continue
    mergeBoxScoreIntoSeasonStats(player, line, seasonLabel)
  }

  league.standings = recomputeStandings(
    league.games,
    league.teams,
    league.rules.seasonLabel,
    league.rules.regularSeasonGames,
  )

  const backToBackTeams = computeBackToBackTeams(
    league.games,
    game.homeTeamId,
    game.awayTeamId,
    game.date,
  )

  const post = processPostGame(
    save,
    {
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeWon: boxScore.homeWin,
      date: game.date,
      minutesPlayed,
      gameFatigue,
      injuriesEnabled: save.settings.injuries,
      fatigueEnabled: save.settings.fatigue,
      backToBackTeams,
    },
    rng,
  )

  if (league.currentDate < game.date) {
    league.currentDate = game.date
  }
  if (save.metadata.currentDate < game.date) {
    save.metadata.currentDate = game.date
  }

  return post
}
