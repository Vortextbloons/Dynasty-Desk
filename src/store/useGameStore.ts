import { create } from 'zustand'
import type { GameSave, GameSettings, SimSpeed } from '@/game/models'
import type { SaveMetadata } from '@/game/models'
import type { LeaguePhase } from '@/game/models/league'
import {
  createSave as dbCreateSave,
  loadSave as dbLoadSave,
  listSaves as dbListSaves,
  deleteSave as dbDeleteSave,
  duplicateSave as dbDuplicateSave,
  updateSave as dbUpdateSave,
  exportSaveToFile as dbExportSaveToFile,
  importSaveFromFile as dbImportSaveFromFile,
} from '@/db/saveRepository'
import { buildSave } from '@/game/core/saveBuilder'
import { normalizeModernSimSpeed } from '@/game/core/settingsPersistence'
import { SeededRandom } from '@/game/sim/rng'
import { simulateGame } from '@/game/sim/gameSimulator'
import { buildBoxScore } from '@/game/sim/boxScoreBuilder'
import { generateStubSchedule } from '@/game/sim/stubSchedule'
import { generateSchedule } from '@/game/league/scheduleGenerator'
import { recomputeStandings, initializeStandings } from '@/game/league/standingsEngine'
import { advanceSeason, advanceToNextUserGame, type SimProgress, type CancelToken } from '@/game/league/simController'
import type { StaticSnapshot } from '@/game/models'
import {
  cutPlayer as cutPlayerAction,
  stretchContract as stretchContractAction,
  buyoutPlayer as buyoutPlayerAction,
  extendPlayer as extendPlayerAction,
  signFreeAgent as signFreeAgentAction,
  type ContractActionResult,
  type ExtensionOffer,
  type FreeAgentOffer,
  type ExceptionType,
} from '@/game/management/contractActions'
import { validateRotation } from '@/game/management/rotationValidator'
import { generateAutoRotation } from '@/game/management/autoRotation'
import { addDays } from '@/lib/utils'
import { toast } from 'sonner'

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let cancelTokenRef: CancelToken | null = null

interface GameStore {
  save: GameSave | null
  saves: SaveMetadata[]
  saveStatus: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  error: string | null
  lastSavedAt: string | null
  simProgress: SimProgress | null
  simRunning: boolean

  initFromSnapshot: (
    snapshot: StaticSnapshot,
    teamId: string,
    leagueName: string,
    managerName: string,
    settings: GameSettings,
  ) => Promise<void>
  loadSaveFromDb: (id: string) => Promise<void>
  loadSavesList: () => Promise<void>
  deleteSave: (id: string) => Promise<void>
  duplicateSave: (id: string, newName: string) => Promise<GameSave | null>
  importSaveFromFile: (file: File) => Promise<void>
  exportSave: (id: string) => Promise<void>
  clearActiveSave: () => void
  scheduleAutoSave: () => void
  cutPlayer: (playerId: string) => ContractActionResult
  stretchContract: (playerId: string) => ContractActionResult
  buyoutPlayer: (playerId: string, settleAmount: number) => ContractActionResult
  extendPlayer: (
    playerId: string,
    offer: ExtensionOffer,
  ) => ContractActionResult
  signFreeAgent: (
    playerId: string,
    offer: FreeAgentOffer,
    exception: ExceptionType,
  ) => ContractActionResult
  advancePhase: () => void
  setStarters: (playerIds: string[]) => void
  setBench: (playerIds: string[]) => void
  setClosingLineup: (playerIds: string[]) => void
  setTargetMinutes: (playerId: string, minutes: number) => void
  forceIncludePlayer: (playerId: string, force: boolean) => void
  autoRotate: () => void
  saveLineup: () => void
  generateRotationIfMissing: () => void
  simOneGame: (gameId: string) => Promise<{ gameId: string; boxScore: ReturnType<typeof buildBoxScore> } | { error: string }>
  simNextGame: () => Promise<{ gameId: string } | { error: string }>
  simDay: () => Promise<{ gamesSimulated: number; gameIds: string[] }>
  simWeek: () => Promise<{ gamesSimulated: number; gameIds: string[] }>
  setSimSpeed: (speed: SimSpeed) => void
  getNextScheduledGameForUser: () => string | null
  ensureSchedule: (count?: number) => string[]
  generateSeasonSchedule: () => void
  simSeason: () => Promise<{ gamesSimulated: number }>
  simUntilUserGame: () => Promise<{ gamesSimulated: number }>
  cancelSimulation: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  save: null,
  saves: [],
  saveStatus: 'idle',
  error: null,
  lastSavedAt: null,
  simProgress: null,
  simRunning: false,

  initFromSnapshot: async (
    snapshot,
    teamId,
    leagueName,
    managerName,
    settings,
  ) => {
    set({ saveStatus: 'loading', error: null })
    try {
      const save = buildSave({
        snapshot,
        teamId,
        leagueName,
        managerName,
        settings,
      })
      await dbCreateSave(save)
      set({
        save,
        saveStatus: 'ready',
        lastSavedAt: save.metadata.updatedAt,
      })
      await get().loadSavesList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create save'
      set({ saveStatus: 'error', error: msg })
      throw err
    }
  },

  loadSaveFromDb: async (id) => {
    set({ saveStatus: 'loading', error: null })
    try {
      const save = await dbLoadSave(id)
      if (!save) {
        throw new Error('Save not found.')
      }
      set({
        save,
        saveStatus: 'ready',
        lastSavedAt: save.metadata.updatedAt,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load save'
      set({ saveStatus: 'error', error: msg })
      throw err instanceof Error ? err : new Error(msg)
    }
  },

  loadSavesList: async () => {
    try {
      const saves = await dbListSaves()
      set({ saves, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load saves'
      set({ error: msg })
    }
  },

  deleteSave: async (id) => {
    await dbDeleteSave(id)
    const { save } = get()
    if (save?.metadata.id === id) {
      set({ save: null, saveStatus: 'idle' })
    }
    await get().loadSavesList()
  },

  duplicateSave: async (id, newName) => {
    const result = await dbDuplicateSave(id, newName)
    await get().loadSavesList()
    return result
  },

  importSaveFromFile: async (file) => {
    set({ saveStatus: 'loading', error: null })
    try {
      const imported = await dbImportSaveFromFile(file)
      set({
        save: imported,
        saveStatus: 'ready',
        lastSavedAt: imported.metadata.updatedAt,
      })
      await get().loadSavesList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import save'
      set({ saveStatus: 'error', error: msg })
      throw err
    }
  },

  exportSave: async (id: string) => {
    await dbExportSaveToFile(id)
  },

  clearActiveSave: () => {
    set({
      save: null,
      saveStatus: 'idle',
      error: null,
      lastSavedAt: null,
    })
  },

  scheduleAutoSave: () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }
    set({ saveStatus: 'saving' })
    autoSaveTimer = setTimeout(() => {
      const { save } = get()
      if (!save) return
      void (async () => {
        try {
          await dbUpdateSave(save)
          if (get().saveStatus === 'saving') {
            set({ saveStatus: 'ready', lastSavedAt: new Date().toISOString() })
          }
        } catch {
          set({ saveStatus: 'error', error: 'Auto-save failed.' })
        }
      })()
    }, 1500)
  },

  cutPlayer: (playerId) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }

    const player = save.league.players[playerId]
    if (!player) return { ok: false, reason: 'Player not found.' }

    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return { ok: false, reason: 'Team not found.' }

    const result = cutPlayerAction(
      playerId,
      player,
      team,
      save.league.players,
      save.league.rules,
    )
    if (!result.ok) return result

    applyPatch(save, result.patch)
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return result
  },

  stretchContract: (playerId) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }

    const player = save.league.players[playerId]
    if (!player) return { ok: false, reason: 'Player not found.' }

    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return { ok: false, reason: 'Team not found.' }

    const result = stretchContractAction(
      playerId,
      player,
      team,
      save.league.rules,
    )
    if (!result.ok) return result

    applyPatch(save, result.patch)
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return result
  },

  buyoutPlayer: (playerId, settleAmount) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }

    const player = save.league.players[playerId]
    if (!player) return { ok: false, reason: 'Player not found.' }

    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return { ok: false, reason: 'Team not found.' }

    const result = buyoutPlayerAction(
      playerId,
      player,
      settleAmount,
      team,
      save.league.rules,
    )
    if (!result.ok) return result

    applyPatch(save, result.patch)
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return result
  },

  extendPlayer: (playerId, offer) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }

    const player = save.league.players[playerId]
    if (!player) return { ok: false, reason: 'Player not found.' }

    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return { ok: false, reason: 'Team not found.' }

    const result = extendPlayerAction(
      playerId,
      player,
      offer,
      team,
      save.league.players,
      save.league.rules,
    )
    if (!result.ok) return result

    applyPatch(save, result.patch)
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return result
  },

  signFreeAgent: (playerId, offer, exception) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }

    const player = save.league.players[playerId]
    if (!player) return { ok: false, reason: 'Player not found.' }

    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return { ok: false, reason: 'Team not found.' }

    const result = signFreeAgentAction(
      playerId,
      player,
      offer,
      exception,
      team,
      save.league.rules,
      team.finances.exceptionsUsed,
    )
    if (!result.ok) return result

    applyPatch(save, result.patch)
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return result
  },

  advancePhase: () => {
    const { save } = get()
    if (!save) return

    const phaseOrder: LeaguePhase[] = [
      'preseason',
      'regular_season',
      'play_in',
      'playoffs',
      'offseason',
      'draft',
      'free_agency',
    ]
    const currentIdx = phaseOrder.indexOf(save.league.phase)
    const nextPhase =
      phaseOrder[(currentIdx + 1) % phaseOrder.length] ?? 'regular_season'

    save.league.phase = nextPhase

    if (nextPhase === 'offseason') {
      for (const team of Object.values(save.league.teams)) {
        if (team) {
          team.finances.exceptionsUsed = {
            mle: false,
            bae: false,
            roomMle: false,
            minimumCount: 0,
          }
        }
      }
    }

    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setStarters: (playerIds) => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    team.lineup.starters = playerIds
    revalidateLineup(save, teamId)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setBench: (playerIds) => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    team.lineup.bench = playerIds
    revalidateLineup(save, teamId)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setClosingLineup: (playerIds) => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    team.lineup.closingLineup = playerIds
    revalidateLineup(save, teamId)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setTargetMinutes: (playerId, minutes) => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    team.lineup.targetMinutes[playerId] = minutes
    team.lineup.generatedByAutoRotate = false
    revalidateLineup(save, teamId)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  forceIncludePlayer: (playerId, force) => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    team.lineup.forceInclude ??= {}
    team.lineup.forceInclude[playerId] = force
    revalidateLineup(save, teamId)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  autoRotate: () => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    const players = new Map(
      Object.entries(save.league.players).filter(([id]) => team.roster.includes(id)),
    )
    const newLineup = generateAutoRotation(team.roster, players)
    team.lineup = newLineup
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  saveLineup: () => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    revalidateLineup(save, teamId)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  generateRotationIfMissing: () => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    const needsRotation =
      team.lineup.starters.length === 0 ||
      Object.keys(team.lineup.targetMinutes).length === 0
    if (!needsRotation) return
    const players = new Map(
      Object.entries(save.league.players).filter(([id]) => team.roster.includes(id)),
    )
    const newLineup = generateAutoRotation(team.roster, players)
    team.lineup = newLineup
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  ensureSchedule: (count) => {
    const { save } = get()
    if (!save) return []
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return []
    const players = new Map(
      Object.entries(save.league.players).filter(([id]) => team.roster.includes(id)),
    )
    if (
      team.lineup.starters.length === 0 ||
      Object.keys(team.lineup.targetMinutes).length === 0
    ) {
      team.lineup = generateAutoRotation(team.roster, players)
    }
    const allTeams = Object.values(save.league.teams).filter((t): t is NonNullable<typeof t> => Boolean(t))
    const stub = generateStubSchedule({
      startDate: save.league.currentDate,
      userTeamId: teamId,
      teams: allTeams,
      count: count ?? 3,
    })
    const createdIds: string[] = []
    for (const game of stub) {
      if (save.league.games[game.id]) continue
      save.league.games[game.id] = game
      createdIds.push(game.id)
    }
    if (createdIds.length > 0) {
      set({ save: { ...save } })
      get().scheduleAutoSave()
    }
    return createdIds
  },

  getNextScheduledGameForUser: () => {
    const { save } = get()
    if (!save) return null
    const teamId = save.league.userTeamId
    const today = save.league.currentDate
    const games = Object.values(save.league.games)
      .filter(
        (g): g is NonNullable<typeof g> =>
          g?.status === 'scheduled' &&
          (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
          g.date >= today,
      )
      .sort((a, b) => a.date.localeCompare(b.date))
    return games[0]?.id ?? null
  },

  simOneGame: async (gameId) => {
    const { save } = get()
    if (!save) return { error: 'No active save.' }
    const game = save.league.games[gameId]
    if (!game) return { error: 'Game not found.' }
    if (game.status === 'final' && game.boxScore) {
      return { gameId, boxScore: game.boxScore }
    }

    const home = save.league.teams[game.homeTeamId]
    const away = save.league.teams[game.awayTeamId]
    if (!home || !away) return { error: 'Teams not found.' }

    const players = new Map(Object.entries(save.league.players))
    const homePlayers = home.roster
      .map((id) => players.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
    const awayPlayers = away.roster
      .map((id) => players.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
    if (homePlayers.length < 5 || awayPlayers.length < 5) {
      return { error: 'Both teams need at least 5 players.' }
    }

    const seededRng = new SeededRandom(save.rngState)

    const { gameState, keyPlays } = await simulateGame({
      id: gameId,
      home,
      away,
      homeLineup: home.lineup,
      awayLineup: away.lineup,
      homePlayers,
      awayPlayers,
      rules: save.league.rules,
      era: save.league.eraConfig,
      rng: seededRng,
      date: game.date,
      injuriesEnabled: save.settings.injuries,
      simSpeed: normalizeModernSimSpeed(save.settings.simSpeed),
    })

    const boxScore = buildBoxScore({ gameState, keyPlays })

    game.status = 'final'
    game.homeScore = boxScore.homeScore
    game.awayScore = boxScore.awayScore
    game.boxScore = boxScore
    game.boxScoreId = gameId
    game.winnerTeamId = boxScore.homeWin ? game.homeTeamId : game.awayTeamId
    if (boxScore.overtimeOccurred) {
      game.ot = true
    }

    save.rngState = seededRng.state
    advanceLeagueDate(save, game.date)
    save.league.standings = recomputeStandings(
      save.league.games,
      save.league.teams,
      save.league.rules.seasonLabel,
      save.league.rules.regularSeasonGames,
    )
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return { gameId, boxScore }
  },

  simNextGame: async () => {
    const { save } = get()
    if (!save) return { error: 'No active save.' }
    let nextId = get().getNextScheduledGameForUser()
    if (!nextId) {
      if (!save.league.scheduleGenerated) {
        get().generateSeasonSchedule()
      }
      nextId = get().getNextScheduledGameForUser()
    }
    if (!nextId) return { error: 'No upcoming games to simulate.' }
    const result = await get().simOneGame(nextId)
    if ('error' in result) return { error: result.error }
    return { gameId: result.gameId }
  },

  simDay: async () => {
    const { save } = get()
    if (!save) return { gamesSimulated: 0, gameIds: [] }
    if (!save.league.scheduleGenerated && Object.keys(save.league.games).length === 0) {
      get().generateSeasonSchedule()
    }
    const today = save.league.currentDate
    const todays = Object.values(save.league.games)
      .filter((g): g is NonNullable<typeof g> => g?.status === 'scheduled' && g.date === today)
    const simIds: string[] = []
    for (const game of todays) {
      const result = await get().simOneGame(game.id)
      if (!('error' in result)) simIds.push(result.gameId)
    }
    if (simIds.length > 0) {
      save.league.standings = recomputeStandings(
        save.league.games,
        save.league.teams,
        save.league.rules.seasonLabel,
        save.league.rules.regularSeasonGames,
      )
      set({ save: { ...save } })
    }
    return { gamesSimulated: simIds.length, gameIds: simIds }
  },

  simWeek: async () => {
    const { save } = get()
    if (!save) return { gamesSimulated: 0, gameIds: [] }
    if (!save.league.scheduleGenerated && Object.keys(save.league.games).length === 0) {
      get().generateSeasonSchedule()
    }
    const simIds: string[] = []
    for (let day = 0; day < 7; day++) {
      const targetDate = addDays(save.league.currentDate, day)
      const dayGames = Object.values(save.league.games).filter(
        (g): g is NonNullable<typeof g> => g?.status === 'scheduled' && g.date === targetDate,
      )
      for (const game of dayGames) {
        const result = await get().simOneGame(game.id)
        if (!('error' in result)) simIds.push(result.gameId)
      }
    }
    if (simIds.length > 0) {
      save.league.standings = recomputeStandings(
        save.league.games,
        save.league.teams,
        save.league.rules.seasonLabel,
        save.league.rules.regularSeasonGames,
      )
      set({ save: { ...save } })
    }
    return { gamesSimulated: simIds.length, gameIds: simIds }
  },

  setSimSpeed: (speed) => {
    const { save } = get()
    if (!save) return
    save.settings.simSpeed = speed
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  generateSeasonSchedule: () => {
    const { save } = get()
    if (!save) return
    if (save.league.scheduleGenerated) return

    const existingGameCount = Object.keys(save.league.games).length
    if (existingGameCount > 0) {
      save.league.games = {}
    }

    const teams = Object.values(save.league.teams).filter(
      (t): t is NonNullable<typeof t> => Boolean(t),
    )
    const rng = new SeededRandom(save.rngState)
    const games = generateSchedule(teams, {
      startDate: save.league.currentDate,
      seasonYear: save.league.seasonYear,
      seasonLabel: save.league.rules.seasonLabel,
      rng,
    })
    save.rngState = rng.state

    for (const game of games) {
      game.isUserTeamGame = game.homeTeamId === save.league.userTeamId || game.awayTeamId === save.league.userTeamId
      save.league.games[game.id] = game
    }

    save.league.scheduleGenerated = true

    const standings = initializeStandings(
      teams,
      save.league.rules.seasonLabel,
      save.league.rules.regularSeasonGames,
    )
    save.league.standings = standings

    set({ save: { ...save } })
    get().scheduleAutoSave()
    toast.success(`Generated ${games.length}-game schedule.`)
  },

  simSeason: async () => {
    const { save } = get()
    if (!save) return { gamesSimulated: 0 }
    if (!save.league.scheduleGenerated) {
      get().generateSeasonSchedule()
    }

    const scheduledGames = Object.values(save.league.games).filter(
      (g) => g?.status === 'scheduled',
    )
    if (scheduledGames.length === 0) return { gamesSimulated: 0 }

    const speed = save.settings.simSpeed === 'normal' ? 'normal' : 'instant'
    const cancelToken: CancelToken = { cancelled: false }
    cancelTokenRef = cancelToken

    set({ simRunning: true, simProgress: { current: 0, total: scheduledGames.length, percentage: 0, currentMatchup: '' } })

    const rng = new SeededRandom(save.rngState)

    try {
      const { results } = await advanceSeason(save, rng, (progress) => {
        set({ simProgress: progress })
      }, { cancelToken, speed })

      save.league.standings = recomputeStandings(
        save.league.games,
        save.league.teams,
        save.league.rules.seasonLabel,
        save.league.rules.regularSeasonGames,
      )

      set({ save: { ...save }, simProgress: null, simRunning: false })
      get().scheduleAutoSave()

      if (cancelToken.cancelled) {
        toast.info(`Sim cancelled. ${results.length} games simulated.`)
      } else {
        toast.success(`Season sim complete. ${results.length} games simulated.`)
      }

      return { gamesSimulated: results.length }
    } catch {
      set({ simProgress: null, simRunning: false })
      return { gamesSimulated: 0 }
    } finally {
      cancelTokenRef = null
    }
  },

  simUntilUserGame: async () => {
    const { save } = get()
    if (!save) return { gamesSimulated: 0 }
    if (!save.league.scheduleGenerated) {
      get().generateSeasonSchedule()
    }

    const rng = new SeededRandom(save.rngState)
    const { results } = await advanceToNextUserGame(save, rng)

    save.league.standings = recomputeStandings(
      save.league.games,
      save.league.teams,
      save.league.rules.seasonLabel,
      save.league.rules.regularSeasonGames,
    )

    set({ save: { ...save } })
    get().scheduleAutoSave()

    return { gamesSimulated: results.length }
  },

  cancelSimulation: () => {
    if (cancelTokenRef) {
      cancelTokenRef.cancelled = true
    }
  },
}))

function applyPatch(
  save: GameSave,
  patch: import('@/game/management/contractActions').ContractPatch,
) {
  for (const [playerId, playerPatch] of Object.entries(patch.players)) {
    const existing = save.league.players[playerId]
    if (existing) {
      Object.assign(existing, playerPatch)
    }
  }
  for (const [teamId, teamPatch] of Object.entries(patch.teams)) {
    const existing = save.league.teams[teamId]
    if (existing) {
      if (teamPatch.roster !== undefined) existing.roster = teamPatch.roster
      if (teamPatch.lineup) {
        if (teamPatch.lineup.starters !== undefined) existing.lineup.starters = teamPatch.lineup.starters
        if (teamPatch.lineup.bench !== undefined) existing.lineup.bench = teamPatch.lineup.bench
        if (teamPatch.lineup.closingLineup !== undefined) existing.lineup.closingLineup = teamPatch.lineup.closingLineup
        if (teamPatch.lineup.targetMinutes !== undefined) existing.lineup.targetMinutes = teamPatch.lineup.targetMinutes
        if (teamPatch.lineup.autoRotation !== undefined) existing.lineup.autoRotation = teamPatch.lineup.autoRotation
        if (teamPatch.lineup.lastValidatedAt !== undefined) existing.lineup.lastValidatedAt = teamPatch.lineup.lastValidatedAt
        if (teamPatch.lineup.lastValidationWarnings !== undefined) existing.lineup.lastValidationWarnings = teamPatch.lineup.lastValidationWarnings
        if (teamPatch.lineup.generatedByAutoRotate !== undefined) existing.lineup.generatedByAutoRotate = teamPatch.lineup.generatedByAutoRotate
        if (teamPatch.lineup.forceInclude !== undefined) existing.lineup.forceInclude = teamPatch.lineup.forceInclude
      }
      if (teamPatch.finances) {
        existing.finances = teamPatch.finances
        if (existing.owner) {
          existing.owner.cash = existing.finances.ownerCash
        }
      }
    }
  }
}

function revalidateLineup(save: GameSave, teamId: string) {
  const team = save.league.teams[teamId]
  if (!team) return
  const players = new Map(
    Object.entries(save.league.players).filter(([id]) => team.roster.includes(id)),
  )
  const result = validateRotation(
    team.roster,
    team.lineup,
    players,
    team.lineup.forceInclude,
  )
  team.lineup.lastValidatedAt = new Date().toISOString()
  team.lineup.lastValidationWarnings = result.warnings.map((w) => w.code)
}

function advanceLeagueDate(save: GameSave, gameDate: string): void {
  if (save.league.currentDate < gameDate) {
    save.league.currentDate = gameDate
  }
  if (save.metadata.currentDate < gameDate) {
    save.metadata.currentDate = gameDate
  }
}
