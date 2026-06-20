import type { GameSave } from '@/game/models/save'
import type { ScheduledGame } from '@/game/models/game'
import type { BoxScoreResult } from '@/game/models/sim'
import { SeededRandom } from '@/game/sim/rng'
import { simulateGame } from '@/game/sim/gameSimulator'
import { buildBoxScore } from '@/game/sim/boxScoreBuilder'
import { normalizeModernSimSpeed } from '@/game/core/settingsPersistence'
import { addDays } from '@/lib/utils'
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
): Promise<SimResult | null> {
  if (game.status === 'final') return null

  const home = save.league.teams[game.homeTeamId]
  const away = save.league.teams[game.awayTeamId]
  if (!home || !away) return null

  const players = new Map(Object.entries(save.league.players))
  const homePlayers = home.roster
    .map((id) => players.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
  const awayPlayers = away.roster
    .map((id) => players.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
  if (homePlayers.length < 5 || awayPlayers.length < 5) return null

  const { gameState, keyPlays } = await simulateGame({
    id: game.id,
    home,
    away,
    homeLineup: home.lineup,
    awayLineup: away.lineup,
    homePlayers,
    awayPlayers,
    rules: save.league.rules,
    era: save.league.eraConfig,
    rng,
    date: game.date,
    injuriesEnabled: save.settings.injuries,
    simSpeed: normalizeModernSimSpeed(save.settings.simSpeed),
  })

  const boxScore = buildBoxScore({ gameState, keyPlays })

  game.status = 'final'
  game.homeScore = boxScore.homeScore
  game.awayScore = boxScore.awayScore
  game.boxScore = boxScore
  game.boxScoreId = game.id
  game.winnerTeamId = boxScore.homeWin ? game.homeTeamId : game.awayTeamId

  if (boxScore.overtimeOccurred) {
    game.ot = true
  }

  save.rngState = rng.state

  if (save.league.currentDate < game.date) {
    save.league.currentDate = game.date
  }
  if (save.metadata.currentDate < game.date) {
    save.metadata.currentDate = game.date
  }

  return {
    gameId: game.id,
    boxScore,
    homeScore: boxScore.homeScore,
    awayScore: boxScore.awayScore,
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

export async function advanceDays(
  save: GameSave,
  days: number,
  rng: SeededRandom,
): Promise<SimBatchResult> {
  const results: SimResult[] = []
  for (let d = 0; d < days; d++) {
    const targetDate = addDays(save.league.currentDate, d)
    const dayGames = getGamesOnDate(save.league.games, targetDate)
    for (const game of dayGames) {
      const result = await simSingleGame(save, game, rng)
      if (result) results.push(result)
    }
  }
  return { gamesSimulated: results.length, results }
}

export async function advanceWeek(
  save: GameSave,
  rng: SeededRandom,
): Promise<SimBatchResult> {
  return advanceDays(save, 7, rng)
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

  const currentDate = new Date(save.league.currentDate)
  const targetDate = new Date(userGameDate)

  for (let d = new Date(currentDate); d < targetDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]!
    const dayGames = getGamesOnDate(save.league.games, dateStr)
    for (const g of dayGames) {
      const result = await simSingleGame(save, g, rng)
      if (result) results.push(result)
    }
  }

  const userDayGames = getGamesOnDate(save.league.games, userGameDate)
  for (const g of userDayGames) {
    if (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId) continue
    const result = await simSingleGame(save, g, rng)
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

  for (let i = 0; i < allScheduled.length; i += gamesPerFrame) {
    if (cancelToken?.cancelled) break

    const chunk = allScheduled.slice(i, i + gamesPerFrame)
    for (const game of chunk) {
      if (game.status === 'final') continue
      const result = await simSingleGame(save, game, rng)
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
