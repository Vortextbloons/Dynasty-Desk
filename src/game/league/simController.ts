import type { GameSave } from '@/game/models/save'
import type { ScheduledGame } from '@/game/models/game'
import type { BoxScoreResult } from '@/game/models/sim'
import { SeededRandom } from '@/game/sim/rng'
import { normalizeModernSimSpeed } from '@/game/core/settingsPersistence'
import { addDays } from '@/lib/utils'
import {
  createSimSessionState,
  finalizationTargetFromSave,
  simulateAndFinalizeGame,
  type SimSessionState,
} from '@/game/league/gameFinalization'
import { GAMES_PER_FRAME_INSTANT, GAMES_PER_FRAME_NORMAL, NORMAL_SIM_DELAY_MS } from './scheduleConstants'

export interface SimResult {
  gameId: string
  boxScore: BoxScoreResult
  homeScore: number
  awayScore: number
  homeTeamId: string
  awayTeamId: string
}

export interface SimBatchResult {
  gamesSimulated: number
  results: SimResult[]
}

export interface SimProgress {
  current: number
  total: number
  percentage: number
  currentMatchup: string
}

export interface CancelToken {
  cancelled: boolean
}

async function simSingleGame(
  save: GameSave,
  game: ScheduledGame,
  rng: SeededRandom,
  session: SimSessionState,
): Promise<SimResult | null> {
  if (game.status === 'final') return null

  const target = finalizationTargetFromSave(save)
  const speed = normalizeModernSimSpeed(save.settings.simSpeed)
  const result = await simulateAndFinalizeGame(
    target,
    game,
    rng,
    session,
    speed,
  )
  if (!result) return null

  save.league.news.push(...result.post.news)
  save.rngState = rng.state

  return {
    gameId: game.id,
    boxScore: result.boxScore,
    homeScore: result.boxScore.homeScore,
    awayScore: result.boxScore.awayScore,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
  }
}

function getGamesOnDate(
  games: Record<string, ScheduledGame>,
  date: string,
): ScheduledGame[] {
  return Object.values(games).filter(
    (g): g is NonNullable<typeof g> =>
      g?.status === 'scheduled' && g.date === date,
  )
}

function getUserGames(
  games: Record<string, ScheduledGame>,
  userTeamId: string,
): ScheduledGame[] {
  return Object.values(games)
    .filter(
      (g): g is NonNullable<typeof g> =>
        g?.status === 'scheduled' &&
        (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function advanceToNextUserGame(
  save: GameSave,
  rng: SeededRandom,
): Promise<SimBatchResult> {
  const results: SimResult[] = []
  const userGames = getUserGames(save.league.games, save.league.userTeamId)
  const userTeamId = save.league.userTeamId

  let userGameDate: string | null = null
  for (const game of userGames) {
    if (save.league.currentDate <= game.date) {
      userGameDate = game.date
      break
    }
  }

  if (!userGameDate) return { gamesSimulated: 0, results: [] }

  let currentDate = save.league.currentDate
  const session = createSimSessionState(save.league)
  while (currentDate < userGameDate) {
    const dayGames = getGamesOnDate(save.league.games, currentDate)
    for (const g of dayGames) {
      const result = await simSingleGame(save, g, rng, session)
      if (result) results.push(result)
    }
    currentDate = addDays(currentDate, 1)
  }

  const userDayGames = getGamesOnDate(save.league.games, userGameDate)
  for (const g of userDayGames) {
    if (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId) continue
    const result = await simSingleGame(save, g, rng, session)
    if (result) results.push(result)
  }

  return { gamesSimulated: results.length, results }
}

export async function advanceSeason(
  save: GameSave,
  rng: SeededRandom,
  onProgress?: (progress: SimProgress) => void,
  options?: { cancelToken?: CancelToken; speed?: 'instant' | 'normal' },
): Promise<SimBatchResult> {
  const speed = options?.speed ?? 'instant'
  const cancelToken = options?.cancelToken
  const gamesPerFrame = speed === 'instant' ? GAMES_PER_FRAME_INSTANT : GAMES_PER_FRAME_NORMAL

  const allScheduled = Object.values(save.league.games).filter(
    (g): g is NonNullable<typeof g> => g?.status === 'scheduled',
  )
  const totalGames = allScheduled.length

  allScheduled.sort((a, b) => a.date.localeCompare(b.date))

  const results: SimResult[] = []
  let processed = 0
  const session = createSimSessionState(save.league)

  for (let i = 0; i < allScheduled.length; i += gamesPerFrame) {
    if (cancelToken?.cancelled) break

    const chunk = allScheduled.slice(i, i + gamesPerFrame)
    for (const game of chunk) {
      if (game.status === 'final') continue
      const result = await simSingleGame(save, game, rng, session)
      if (result) results.push(result)
      processed++
    }

    onProgress?.({
      current: processed,
      total: totalGames,
      percentage: Math.round((processed / totalGames) * 100),
      currentMatchup:
        chunk.length > 0
          ? `${chunk[0]!.homeTeamId} vs ${chunk[0]!.awayTeamId}`
          : '',
    })

    if (speed === 'normal') {
      await delay(NORMAL_SIM_DELAY_MS)
    } else {
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
    }
  }

  return { gamesSimulated: results.length, results }
}
