import type { GameSave } from '@/game/models/save'
import type { LeagueState } from '@/game/models/league'
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
import { simulateGame } from '@/game/sim/gameSimulator'
import { buildBoxScore } from '@/game/sim/boxScoreBuilder'
import { normalizeModernSimSpeed } from '@/game/core/settingsPersistence'
import type { SeededRandom } from '@/game/sim/rng'
import type { SimSpeed } from '@/game/models'
import type { LiveGameSnapshot } from '@/game/sim/liveGameSnapshot'
import { addDays, daysBetween } from '@/lib/utils'
import { checkRecords } from '@/game/league/recordTracker'
import { updateRivalry } from '@/game/league/rivalryEngine'
import { createRecordBrokenEvent } from '@/game/league/newsEngine'

export interface GameSimSettings {
  injuries: boolean
  fatigue: boolean
}

export interface FinalizationTarget {
  league: LeagueState
  settings: GameSimSettings
  metadata?: { currentDate: string }
}

export interface SimSessionState {
  lastFatigueRecoveryDate: string
}

export function finalizationTargetFromSave(save: GameSave): FinalizationTarget {
  return {
    league: save.league,
    settings: {
      injuries: save.settings.injuries,
      fatigue: save.settings.fatigue,
    },
    metadata: save.metadata,
  }
}

export function createSimSessionState(league: { currentDate: string }): SimSessionState {
  return { lastFatigueRecoveryDate: league.currentDate }
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
    if (g?.status !== 'final' || g.date !== prevDate) continue
    if (g.homeTeamId === homeTeamId || g.awayTeamId === homeTeamId) {
      backToBack.add(homeTeamId)
    }
    if (g.homeTeamId === awayTeamId || g.awayTeamId === awayTeamId) {
      backToBack.add(awayTeamId)
    }
  }
  return backToBack
}

export function applyLeagueInjuryRecovery(
  league: LeagueState,
  days: number,
): void {
  if (days <= 0) return
  for (const player of Object.values(league.players)) {
    if (!player || player.health.status === 'healthy') continue
    player.health = processRecovery(player.health, days)
  }
}

export function prepareGameDay(
  target: FinalizationTarget,
  game: ScheduledGame,
  session: SimSessionState,
): void {
  const { league, settings } = target

  if (game.date > session.lastFatigueRecoveryDate) {
    const elapsed = daysBetween(session.lastFatigueRecoveryDate, game.date)
    if (elapsed > 0) {
      if (settings.fatigue) {
        recoverFatigueBetweenGames(league, elapsed)
      }
      if (settings.injuries) {
        applyLeagueInjuryRecovery(league, elapsed)
      }
    }
    session.lastFatigueRecoveryDate = game.date
  }
}

export function finalizeSimulatedGame(
  target: FinalizationTarget,
  game: ScheduledGame,
  boxScore: BoxScoreResult,
  gameFatigue: Record<string, number>,
  minutesPlayed: Record<string, number>,
  rng: SeededRandom,
): PostGameResult {
  const { league, settings } = target

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
    { league, settings, metadata: target.metadata ?? { currentDate: league.currentDate } } as GameSave,
    {
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeWon: boxScore.homeWin,
      date: game.date,
      minutesPlayed,
      gameFatigue,
      injuriesEnabled: settings.injuries,
      fatigueEnabled: settings.fatigue,
      backToBackTeams,
    },
    rng,
  )

  const newRecords = checkRecords(league, boxScore, game.date)
  for (const record of newRecords) {
    const existingIdx = league.records.findIndex(
      (r) => r.category === record.category && r.seasonYear === record.seasonYear,
    )
    if (existingIdx >= 0) {
      league.records[existingIdx] = record
    } else {
      league.records.push(record)
    }
    if (record.playerId) {
      league.news.push(createRecordBrokenEvent(record, record.playerId, game.date))
    }
  }

  const isPlayoff = league.phase === 'playoffs'
  updateRivalry(
    league.rivalries,
    game.homeTeamId,
    game.awayTeamId,
    boxScore,
    game.date,
    isPlayoff,
  )

  if (league.currentDate < game.date) {
    league.currentDate = game.date
  }
  if (target.metadata && target.metadata.currentDate < game.date) {
    target.metadata.currentDate = game.date
  }

  return post
}

export async function simulateAndFinalizeGame(
  target: FinalizationTarget,
  game: ScheduledGame,
  rng: SeededRandom,
  session: SimSessionState,
  simSpeed: SimSpeed = 'instant',
  onTick?: (snapshot: LiveGameSnapshot) => void | Promise<void>,
): Promise<{ boxScore: BoxScoreResult; post: PostGameResult } | null> {
  const { league } = target
  const home = league.teams[game.homeTeamId]
  const away = league.teams[game.awayTeamId]
  if (!home || !away) return null

  const homePlayers = home.roster
    .map((id) => league.players[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
  const awayPlayers = away.roster
    .map((id) => league.players[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
  if (homePlayers.length < 5 || awayPlayers.length < 5) return null

  prepareGameDay(target, game, session)

  const { gameState, keyPlays, gameFatigue } = await simulateGame({
    id: game.id,
    home,
    away,
    homeLineup: home.lineup,
    awayLineup: away.lineup,
    homePlayers,
    awayPlayers,
    rules: league.rules,
    era: league.eraConfig,
    rng,
    date: game.date,
    injuriesEnabled: target.settings.injuries,
    fatigueEnabled: target.settings.fatigue,
    simSpeed: normalizeModernSimSpeed(simSpeed),
    onTick: normalizeModernSimSpeed(simSpeed) === 'normal' ? onTick : undefined,
  })

  const boxScore = buildBoxScore({ gameState, keyPlays })
  const post = finalizeSimulatedGame(
    target,
    game,
    boxScore,
    gameFatigue,
    gameState.minutesPlayed,
    rng,
  )

  return { boxScore, post }
}
