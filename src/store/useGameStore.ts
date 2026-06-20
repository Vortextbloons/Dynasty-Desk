import { create } from 'zustand'
import type { GameSave, GameSettings, SimSpeed } from '@/game/models'
import type { SaveMetadata } from '@/game/models'
import type { LeaguePhase } from '@/game/models/league'
import type { TradeAsset, TradeProposal } from '@/game/models/trade'
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
import type { TrainingFocus } from '@/game/models/training'
import type { TeamStrategy } from '@/game/models/team'
import type { NewsEvent, NewsType, NewsImportance } from '@/game/models/news'
import {
  filterNews,
  markNewsRead,
  markAllNewsRead,
} from '@/game/league/newsEngine'
import {
  runLeagueEndOfSeasonDevelopment,
  runLeagueSeasonAwards,
} from '@/game/league/seasonWrapUp'
import { SeededRandom } from '@/game/sim/rng'
import { simulateGame } from '@/game/sim/gameSimulator'
import { buildBoxScore } from '@/game/sim/boxScoreBuilder'
import {
  createSimSessionState,
  finalizeSimulatedGame,
  prepareGameDay,
} from '@/game/league/gameFinalization'
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
import {
  generatePlayoffBracket as generateBracket,
  advancePlayoffSeries,
  simulateSeries as simSeries,
} from '@/game/league/playoffEngine'
import { computeFinalsMvp } from '@/game/league/awardsEngine'
import { transitionToOffseason as doTransitionToOffseason } from '@/game/league/offseasonTransition'
import { beginOffseason, advancePhase as advanceOffseasonPhase, decideOption, upcomingDraftYear } from '@/game/league/offseasonEngine'
import {
  simulateDraftPick,
  autoDraftOffClock,
  autoPickForTeam,
  getCurrentPickOwner,
  getDraftClassForYear,
} from '@/game/league/draftEngine'
import { allocateScoutingPoints as allocateScouting, getScoutingStateForClass } from '@/game/league/scoutingEngine'
import {
  submitOffer as submitFAOffer,
  matchOfferSheet,
  signPlayerFromOffer,
  validateFreeAgentOffer,
} from '@/game/management/freeAgencyEngine'
import type { FreeAgentOfferInput } from '@/game/models/freeAgent'
import { canSignTwoWay, addTwoWayPlayer } from '@/game/management/twoWayEngine'
import { evaluateTradeForAI } from '@/game/management/tradeAI'
import { validateTradeLegality, executeTrade as executeTradeEngine } from '@/game/management/tradeEngine'
import { findTrades as findTradesEngine } from '@/game/management/tradeFinder'
import {
  createTradeCompletedEvent,
  createVetoEvent,
  createTradeRumorEvent,
  createTradeLockedEvent,
} from '@/game/league/tradeNews'

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
  advancePhase: () => Promise<{ newPhase: LeaguePhase; blocked?: boolean; reason?: string } | void>
  allocateScoutingPoints: (prospectId: string, points: number) => { ok: boolean; reason?: string }
  makeDraftPick: (prospectId: string, isTwoWay?: boolean) => { ok: boolean; reason?: string }
  autoDraftOffClock: () => void
  skipDraftPick: () => void
  makeFreeAgentOffer: (playerId: string, offer: FreeAgentOfferInput) => { ok: boolean; reason?: string }
  withdrawOffer: (offerId: string) => void
  matchOfferSheetAction: (offerId: string) => { matched: boolean; reason?: string }
  decideOption: (playerId: string, accept: boolean) => void
  signTwoWay: (playerId: string) => { ok: boolean; reason?: string }
  setStarters: (playerIds: string[]) => void
  setBench: (playerIds: string[]) => void
  setClosingLineup: (playerIds: string[]) => void
  setTargetMinutes: (playerId: string, minutes: number) => void
  setTrainingFocus: (playerId: string, focus: TrainingFocus) => void
  setTeamTrainingFocus: (teamId: string, focus: TrainingFocus) => void
  setLoadManagement: (playerId: string, targetMinutes: number) => void
  setTeamStrategy: (teamId: string, strategy: TeamStrategy) => void
  markNewsRead: (newsId: string) => void
  markAllNewsRead: () => void
  filterNews: (filters: {
    type?: NewsType
    teamId?: string
    playerId?: string
    importance?: NewsImportance
    unreadOnly?: boolean
  }) => NewsEvent[]
  runEndOfSeasonDevelopment: () => void
  computeSeasonAwardsAction: () => void
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
  generateSeasonSchedule: () => { ok: boolean; reason?: string; gameCount?: number; replacedGames?: boolean }
  simSeason: () => Promise<{ gamesSimulated: number; cancelled?: boolean; phaseTransitioned?: boolean; nextPhase?: string | null }>
  simUntilUserGame: () => Promise<{ gamesSimulated: number }>
  cancelSimulation: () => void

  generatePlayoffBracket: () => void
  simNextPlayoffGame: () => Promise<{ gamesSimulated: number; seriesCompleted: string[]; bracketComplete: boolean }>
  simPlayoffSeries: (seriesId: string) => Promise<{ gamesSimulated: number }>
  simAllPlayoffGames: () => Promise<{ gamesSimulated: number; bracketComplete: boolean }>
  transitionToOffseason: () => void

  createTradeProposal: (teamIds: string[]) => TradeProposal | null
  addAssetToTrade: (proposalId: string, teamId: string, asset: TradeAsset) => void
  addTeamToTrade: (proposalId: string, teamId: string) => void
  removeTeamFromTrade: (proposalId: string, teamId: string) => void
  importProposal: (proposal: TradeProposal) => void
  removeAssetFromTrade: (proposalId: string, teamId: string, assetIndex: number) => void
  setPickProtection: (pickId: string, protection: string | null) => void
  cancelTradeProposal: (proposalId: string) => void
  submitTrade: (proposalId: string) => {
    accepted: boolean
    counterOffer?: TradeProposal
    rejectionReason?: string
    vetoReason?: string
    vetoingOwnerName?: string
  }
  findTradesForPlayer: (playerId: string) => TradeProposal[]
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

  advancePhase: async () => {
    const { save } = get()
    if (!save) return

    const rng = new SeededRandom(save.rngState)
    const result = await advanceOffseasonPhase(
      save.league,
      save.league.userTeamId,
      rng,
    )
    if (!result.blocked) {
      save.league.news.push(...result.newsEvents)
    }
    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return {
      newPhase: result.newPhase,
      blocked: result.blocked,
      reason: result.reason,
    }
  },

  allocateScoutingPoints: (prospectId, points) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }
    const teamId = save.league.userTeamId
    const draftClass = getDraftClassForYear(save.league, upcomingDraftYear(save.league))
    if (!draftClass) return { ok: false, reason: 'Draft class not available yet.' }
    const state = getScoutingStateForClass(save.league, teamId, draftClass)
    if (!state) return { ok: false, reason: 'Scouting state not found.' }
    const prospect = draftClass.prospects.find((p) => p.id === prospectId)
    if (!prospect) return { ok: false, reason: 'Prospect not found.' }
    const result = allocateScouting(state, prospect, points)
    if ('error' in result) return { ok: false, reason: result.error }
    save.league.scoutingState[`${teamId}-${draftClass.id}`] = result.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return { ok: true }
  },

  makeDraftPick: (prospectId, isTwoWay = false) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }
    if (save.league.phase !== 'draft') {
      return { ok: false, reason: 'Not in draft phase.' }
    }
    const draft = Object.values(save.league.drafts).find((d) => d?.status === 'in_progress')
    if (!draft) return { ok: false, reason: 'No draft in progress.' }
    const owner = getCurrentPickOwner(save.league, draft)
    if (!owner || owner.teamId !== save.league.userTeamId) {
      return { ok: false, reason: 'Not your pick.' }
    }
    const rng = new SeededRandom(save.rngState)
    const result = simulateDraftPick(
      save.league,
      draft,
      save.league.userTeamId,
      prospectId,
      isTwoWay,
      rng,
    )
    if ('error' in result) return { ok: false, reason: result.error }
    save.rngState = rng.state
    autoDraftOffClock(save.league, draft, save.league.userTeamId, rng)
    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return { ok: true }
  },

  autoDraftOffClock: () => {
    const { save } = get()
    if (!save) return
    const draft = Object.values(save.league.drafts).find((d) => d?.status === 'in_progress')
    if (!draft) return
    const rng = new SeededRandom(save.rngState)
    autoDraftOffClock(save.league, draft, save.league.userTeamId, rng)
    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  skipDraftPick: () => {
    const { save } = get()
    if (!save) return
    const draft = Object.values(save.league.drafts).find((d) => d?.status === 'in_progress')
    if (!draft) return
    const owner = getCurrentPickOwner(save.league, draft)
    if (!owner || owner.teamId !== save.league.userTeamId) return
    const rng = new SeededRandom(save.rngState)
    autoPickForTeam(save.league, draft, save.league.userTeamId, rng)
    autoDraftOffClock(save.league, draft, save.league.userTeamId, rng)
    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  makeFreeAgentOffer: (playerId, offer) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }
    if (save.league.phase !== 'free_agency' && save.league.phase !== 'preseason') {
      return { ok: false, reason: 'Not in free agency or preseason.' }
    }
    const player = save.league.players[playerId]
    if (!player || player.teamId !== null) {
      return { ok: false, reason: 'Player is not a free agent.' }
    }
    const validation = validateFreeAgentOffer(
      save.league,
      save.league.userTeamId,
      playerId,
      offer,
    )
    if (!validation.ok) return validation
    const isRFA = save.league.qualifyingOffers.some((q) => q.playerId === playerId)
    const faOffer = submitFAOffer(
      offer,
      playerId,
      save.league.userTeamId,
      player,
      save.league.currentDate,
      isRFA,
    )
    save.league.freeAgentOffers.push(faOffer)
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return { ok: true }
  },

  withdrawOffer: (offerId) => {
    const { save } = get()
    if (!save) return
    const offer = save.league.freeAgentOffers.find((o) => o.id === offerId)
    if (offer && offer.teamId === save.league.userTeamId) {
      offer.status = 'withdrawn'
    }
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  matchOfferSheetAction: (offerId) => {
    const { save } = get()
    if (!save) return { matched: false, reason: 'No active save.' }
    const offer = save.league.freeAgentOffers.find((o) => o.id === offerId)
    if (!offer) return { matched: false, reason: 'Offer not found.' }
    const player = save.league.players[offer.playerId]
    const team = save.league.teams[save.league.userTeamId]
    if (!player || !team) return { matched: false, reason: 'Invalid state.' }
    const result = matchOfferSheet(offer, team, save.league.userTeamId, save.league.currentDate, player)
    if (result.matched) {
      const matchedOffer = { ...offer, teamId: save.league.userTeamId }
      signPlayerFromOffer(save.league, matchedOffer, player)
      offer.status = 'matched'
      offer.matchedByTeamId = save.league.userTeamId
    }
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return result
  },

  decideOption: (playerId, accept) => {
    const { save } = get()
    if (!save) return
    const rng = new SeededRandom(save.rngState)
    decideOption(save.league, playerId, accept, save.league.userTeamId, rng)
    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  signTwoWay: (playerId) => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }
    const player = save.league.players[playerId]
    const team = save.league.teams[save.league.userTeamId]
    if (!player || !team) return { ok: false, reason: 'Invalid state.' }
    const check = canSignTwoWay(team, player)
    if (!check.canSign) return { ok: false, reason: check.reason }
    addTwoWayPlayer(team, playerId)
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return { ok: true }
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

  setTrainingFocus: (playerId, focus) => {
    const { save } = get()
    if (!save) return
    const player = save.league.players[playerId]
    if (!player) return
    player.development.trainingFocus = focus
    player.development.focusArea = focus
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setTeamTrainingFocus: (teamId, focus) => {
    const { save } = get()
    if (!save) return
    const team = save.league.teams[teamId]
    if (!team) return
    team.trainingFocus = focus
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setLoadManagement: (playerId, targetMinutes) => {
    const { save } = get()
    if (!save) return
    const teamId = save.league.userTeamId
    const team = save.league.teams[teamId]
    if (!team) return
    const existing = team.loadManagement.findIndex((e) => e.playerId === playerId)
    if (existing >= 0) {
      team.loadManagement[existing] = { playerId, targetMinutes }
    } else {
      team.loadManagement.push({ playerId, targetMinutes })
    }
    team.lineup.targetMinutes[playerId] = targetMinutes
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setTeamStrategy: (teamId, strategy) => {
    const { save } = get()
    if (!save) return
    const team = save.league.teams[teamId]
    if (!team) return
    team.strategy = strategy
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  markNewsRead: (newsId) => {
    const { save } = get()
    if (!save) return
    save.league.news = markNewsRead(save.league.news, newsId)
    set({ save: { ...save } })
  },

  markAllNewsRead: () => {
    const { save } = get()
    if (!save) return
    save.league.news = markAllNewsRead(save.league.news)
    set({ save: { ...save } })
  },

  filterNews: (filters) => {
    const { save } = get()
    if (!save) return []
    return filterNews(save.league.news, filters)
  },

  runEndOfSeasonDevelopment: () => {
    const { save } = get()
    if (!save) return
    const rng = new SeededRandom(save.rngState)
    runLeagueEndOfSeasonDevelopment(save.league, rng)
    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  computeSeasonAwardsAction: () => {
    const { save } = get()
    if (!save) return
    const news = runLeagueSeasonAwards(save.league)
    save.league.news.push(...news)
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
    const session = createSimSessionState(save)

    prepareGameDay(save, game, session)

    const { gameState, keyPlays, gameFatigue } = await simulateGame({
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
      fatigueEnabled: save.settings.fatigue,
      simSpeed: normalizeModernSimSpeed(save.settings.simSpeed),
    })

    const boxScore = buildBoxScore({ gameState, keyPlays })

    const post = finalizeSimulatedGame(
      save,
      game,
      boxScore,
      gameFatigue,
      gameState.minutesPlayed,
      seededRng,
    )
    save.league.news.push(...post.news)

    save.rngState = seededRng.state

    set({ save: { ...save } })
    get().scheduleAutoSave()
    return { gameId, boxScore }
  },

  simNextGame: async () => {
    const { save } = get()
    if (!save) return { error: 'No active save.' }
    const nextId = get().getNextScheduledGameForUser()
    if (!nextId) {
      if (!save.league.scheduleGenerated) {
        return { error: 'No schedule yet. Go to Schedule and generate one first.' }
      }
      return { error: 'No upcoming games to simulate.' }
    }
    const result = await get().simOneGame(nextId)
    if ('error' in result) return { error: result.error }
    return { gameId: result.gameId }
  },

  simDay: async () => {
    const { save } = get()
    if (!save) return { gamesSimulated: 0, gameIds: [] }
    if (!save.league.scheduleGenerated && Object.keys(save.league.games).length === 0) {
      const result = get().generateSeasonSchedule()
      if (!result.ok) return { gamesSimulated: 0, gameIds: [] }
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
      get().scheduleAutoSave()
    }
    return { gamesSimulated: simIds.length, gameIds: simIds }
  },

  simWeek: async () => {
    const { save } = get()
    if (!save) return { gamesSimulated: 0, gameIds: [] }
    if (!save.league.scheduleGenerated && Object.keys(save.league.games).length === 0) {
      const result = get().generateSeasonSchedule()
      if (!result.ok) return { gamesSimulated: 0, gameIds: [] }
    }
    const simIds: string[] = []
    const startDate = save.league.currentDate
    for (let day = 0; day < 7; day++) {
      const targetDate = addDays(startDate, day)
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
      get().scheduleAutoSave()
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

  generateSeasonSchedule: (): { ok: boolean; reason?: string; gameCount?: number; replacedGames?: boolean } => {
    const { save } = get()
    if (!save) return { ok: false, reason: 'No active save.' }
    if (save.league.scheduleGenerated) return { ok: true, gameCount: Object.keys(save.league.games).length }

    const existingGames = Object.values(save.league.games)
    const hasFinalGames = existingGames.some((g) => g?.status === 'final')
    if (hasFinalGames) {
      return { ok: false, reason: 'Cannot regenerate schedule — games have already been played.' }
    }

    const replacedGames = existingGames.length > 0
    if (replacedGames) {
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
    return { ok: true, gameCount: games.length, replacedGames }
  },

  simSeason: async () => {
    const { save } = get()
    if (!save) return { gamesSimulated: 0 }
    if (!save.league.scheduleGenerated) {
      const scheduleResult = get().generateSeasonSchedule()
      if (!scheduleResult.ok) {
        return { gamesSimulated: 0 }
      }
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

      let phaseTransitioned = false
      let nextPhase: string | null = null
      if (!cancelToken.cancelled) {
        const remainingScheduled = Object.values(save.league.games).filter(
          (g) => g?.status === 'scheduled',
        ).length
        if (remainingScheduled === 0) {
          nextPhase = save.league.rules.hasPlayIn ? 'play_in' : 'playoffs'
          save.league.phase = nextPhase as LeaguePhase
          phaseTransitioned = true

          const bracket = generateBracket(save.league, save.league.rules)
          save.league.playoffBracket = bracket
        }
      }

      set({ save: { ...save }, simProgress: null, simRunning: false })
      get().scheduleAutoSave()

      return {
        gamesSimulated: results.length,
        cancelled: cancelToken.cancelled,
        phaseTransitioned,
        nextPhase,
      }
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

  generatePlayoffBracket: () => {
    const { save } = get()
    if (!save) return

    const bracket = generateBracket(save.league, save.league.rules)
    save.league.playoffBracket = bracket

    if (bracket.status === 'bracket') {
      save.league.phase = 'playoffs'
    } else if (bracket.status === 'play_in') {
      save.league.phase = 'play_in'
    }

    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  simNextPlayoffGame: async () => {
    const { save } = get()
    if (!save || !save.league.playoffBracket) {
      return { gamesSimulated: 0, seriesCompleted: [], bracketComplete: false }
    }

    const cancelToken: CancelToken = { cancelled: false }
    cancelTokenRef = cancelToken

    set({ simRunning: true, simProgress: { current: 0, total: 1, percentage: 0, currentMatchup: 'Playoff game' } })

    const rng = new SeededRandom(save.rngState)

    try {
      const result = await advancePlayoffSeries(save.league, rng, { injuriesEnabled: save.settings.injuries })

      if (result.bracketComplete) {
        const mvpId = computeFinalsMvp(save.league.playoffBracket, save.league.games)
        if (mvpId) {
          save.league.playoffBracket.finalsMvpPlayerId = mvpId
        }
      }

      save.rngState = rng.state
      set({ save: { ...save }, simProgress: null, simRunning: false })
      get().scheduleAutoSave()

      return {
        gamesSimulated: result.gamesSimulated,
        seriesCompleted: result.seriesCompleted,
        bracketComplete: result.bracketComplete,
      }
    } catch {
      set({ simProgress: null, simRunning: false })
      return { gamesSimulated: 0, seriesCompleted: [], bracketComplete: false }
    } finally {
      cancelTokenRef = null
    }
  },

  simPlayoffSeries: async (seriesId: string) => {
    const { save } = get()
    if (!save || !save.league.playoffBracket) {
      return { gamesSimulated: 0 }
    }

    const rng = new SeededRandom(save.rngState)
    const results = await simSeries(save.league, seriesId, rng, { injuriesEnabled: save.settings.injuries })

    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()

    return { gamesSimulated: results.length }
  },

  simAllPlayoffGames: async () => {
    const { save } = get()
    if (!save || !save.league.playoffBracket) {
      return { gamesSimulated: 0, bracketComplete: false }
    }

    const cancelToken: CancelToken = { cancelled: false }
    cancelTokenRef = cancelToken

    let totalSimulated = 0
    let bracketComplete = false

    const totalGames = countRemainingPlayoffGames(save.league.playoffBracket)
    set({ simRunning: true, simProgress: { current: 0, total: totalGames || 100, percentage: 0, currentMatchup: 'Playoffs' } })

    const rng = new SeededRandom(save.rngState)

    try {
      let stallCount = 0
      while (!bracketComplete) {
        if (cancelToken.cancelled) break

        const result = await advancePlayoffSeries(save.league, rng, { injuriesEnabled: save.settings.injuries })
        totalSimulated += result.gamesSimulated
        bracketComplete = result.bracketComplete

        if (result.gamesSimulated === 0 && !bracketComplete) {
          stallCount++
          if (stallCount > 3) break
        } else {
          stallCount = 0
        }

        const remaining = countRemainingPlayoffGames(save.league.playoffBracket)
        const progress = totalGames > 0 ? Math.min(99, Math.round(((totalGames - remaining) / totalGames) * 100)) : 0
        set({ simProgress: { current: totalSimulated, total: totalGames, percentage: progress, currentMatchup: 'Simulating playoffs...' } })

        await new Promise<void>((r) => setTimeout(r, 0))
      }

      if (bracketComplete) {
        const mvpId = computeFinalsMvp(save.league.playoffBracket, save.league.games)
        if (mvpId) {
          save.league.playoffBracket.finalsMvpPlayerId = mvpId
        }
      }

      save.rngState = rng.state
      set({ save: { ...save }, simProgress: null, simRunning: false })
      get().scheduleAutoSave()

      return { gamesSimulated: totalSimulated, bracketComplete }
    } catch {
      set({ simProgress: null, simRunning: false })
      return { gamesSimulated: 0, bracketComplete: false }
    } finally {
      cancelTokenRef = null
    }
  },

  transitionToOffseason: () => {
    const { save } = get()
    if (!save) return

    doTransitionToOffseason(save.league)
    const rng = new SeededRandom(save.rngState)
    runLeagueEndOfSeasonDevelopment(save.league, rng)
    save.rngState = rng.state
    beginOffseason(save.league, rng)
    save.rngState = rng.state
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  createTradeProposal: (teamIds) => {
    const { save } = get()
    if (!save) return null
    if (save.league.phase === 'playoffs' || save.league.phase === 'play_in') {
      save.league.news = [
        ...save.league.news,
        createTradeLockedEvent(save.league.currentDate),
      ]
      set({ save: { ...save } })
      return null
    }
    if (save.league.phase === 'draft') return null
    if (teamIds.length < 2 || teamIds.length > 4) return null
    const proposal: TradeProposal = {
      id: crypto.randomUUID(),
      sides: teamIds.map((teamId) => ({ teamId, outgoing: [], incoming: [] })),
      createdAt: new Date().toISOString(),
      status: 'draft',
    }
    save.league.activeProposals = [...save.league.activeProposals, proposal]
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return proposal
  },

  addAssetToTrade: (proposalId, teamId, asset) => {
    const { save } = get()
    if (!save) return
    const proposal = save.league.activeProposals.find((p) => p.id === proposalId)
    if (!proposal) return
    const side = proposal.sides.find((s) => s.teamId === teamId)
    if (!side) return
    if (isAssetDuplicate(side.outgoing, asset)) return
    let nextAsset: TradeAsset = { ...asset }
    if (!nextAsset.toTeamId) {
      const inferred = inferTargetTeamId(proposal, teamId)
      if (inferred) nextAsset.toTeamId = inferred
    }
    side.outgoing = [...side.outgoing, nextAsset]
    reconcileSides(proposal)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  addTeamToTrade: (proposalId, teamId) => {
    const { save } = get()
    if (!save) return
    const proposal = save.league.activeProposals.find((p) => p.id === proposalId)
    if (!proposal) return
    if (proposal.sides.some((s) => s.teamId === teamId)) return
    if (proposal.sides.length >= 4) return
    proposal.sides = [
      ...proposal.sides,
      { teamId, outgoing: [], incoming: [] },
    ]
    reconcileSides(proposal)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  removeTeamFromTrade: (proposalId, teamId) => {
    const { save } = get()
    if (!save) return
    const proposal = save.league.activeProposals.find((p) => p.id === proposalId)
    if (!proposal) return
    if (proposal.sides.length <= 2) return
    proposal.sides = proposal.sides
      .filter((s) => s.teamId !== teamId)
      .map((s) => ({
        ...s,
        outgoing: s.outgoing.filter(
          (a) => !a.toTeamId || a.toTeamId !== teamId,
        ),
      }))
    reconcileSides(proposal)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  importProposal: (proposal) => {
    const { save } = get()
    if (!save) return
    reconcileSides(proposal)
    if (save.league.activeProposals.some((p) => p.id === proposal.id)) return
    save.league.activeProposals = [...save.league.activeProposals, proposal]
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  removeAssetFromTrade: (proposalId, teamId, assetIndex) => {
    const { save } = get()
    if (!save) return
    const proposal = save.league.activeProposals.find((p) => p.id === proposalId)
    if (!proposal) return
    const side = proposal.sides.find((s) => s.teamId === teamId)
    if (!side) return
    side.outgoing = side.outgoing.filter((_, i) => i !== assetIndex)
    reconcileSides(proposal)
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  cancelTradeProposal: (proposalId) => {
    const { save } = get()
    if (!save) return
    save.league.activeProposals = save.league.activeProposals.filter(
      (p) => p.id !== proposalId,
    )
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  setPickProtection: (pickId, protection) => {
    const { save } = get()
    if (!save) return
    const pick = save.league.draftPicks.find((p) => p.id === pickId)
    if (!pick) return
    if (pick.currentTeamId !== save.league.userTeamId) return
    if (protection === null || protection.trim() === '') {
      pick.protected = undefined
    } else {
      const cleaned = protection.trim().slice(0, 16)
      pick.protected = cleaned
    }
    set({ save: { ...save } })
    get().scheduleAutoSave()
  },

  submitTrade: (proposalId) => {
    const { save } = get()
    if (!save) {
      return { accepted: false, rejectionReason: 'No active save.' }
    }
    if (save.league.phase === 'playoffs' || save.league.phase === 'play_in') {
      save.league.news = [
        ...save.league.news,
        createTradeLockedEvent(save.league.currentDate),
      ]
      set({ save: { ...save } })
      return { accepted: false, rejectionReason: 'Trade market closed during playoffs' }
    }
    if (save.league.phase === 'draft') {
      return { accepted: false, rejectionReason: 'Trade market closed during the draft.' }
    }
    const proposal = save.league.activeProposals.find((p) => p.id === proposalId)
    if (!proposal) {
      return { accepted: false, rejectionReason: 'Trade not found.' }
    }
    const legality = validateTradeLegality(proposal, save.league, save.league.rules)
    if (!legality.legal) {
      return { accepted: false, rejectionReason: legality.reason ?? 'Trade is illegal.' }
    }

    const projectedWins: Record<string, number> = {}
    for (const [tid, standing] of Object.entries(save.league.standings)) {
      projectedWins[tid] = standing.wins || 41
    }

    for (const side of proposal.sides) {
      if (side.teamId === save.league.userTeamId) continue
      const aiTeam = save.league.teams[side.teamId]
      if (!aiTeam) continue
      const response = evaluateTradeForAI(proposal, aiTeam, {
        projectedWins,
        userTeamId: save.league.userTeamId,
        league: save.league,
      })
      if (response.kind === 'rejected') {
        proposal.status = 'rejected'
        proposal.rejectionReason = response.reason
        set({ save: { ...save } })
        get().scheduleAutoSave()
        return { accepted: false, rejectionReason: response.reason }
      }
      if (response.kind === 'counter') {
        save.league.activeProposals = [
          ...save.league.activeProposals.filter((p) => p.id !== proposalId),
          response.counterOffer,
        ]
        set({ save: { ...save } })
        get().scheduleAutoSave()
        return {
          accepted: false,
          counterOffer: response.counterOffer,
          rejectionReason: 'AI proposed a counter-offer.',
        }
      }
      if (response.kind === 'vetoed') {
        proposal.status = 'vetoed'
        proposal.vetoReason = response.reason
        proposal.vetoingOwnerName = response.vetoingOwnerName
        proposal.vetoingTeamId = response.vetoingTeamId
        save.league.news = [
          ...save.league.news,
          createVetoEvent(
            proposal,
            save.league,
            response.vetoingOwnerName,
            response.reason,
          ),
        ]
        set({ save: { ...save } })
        get().scheduleAutoSave()
        return {
          accepted: false,
          vetoReason: response.reason,
          vetoingOwnerName: response.vetoingOwnerName,
        }
      }
    }

    const result = executeTradeEngine(proposal, save.league, save.league.rules)
    save.league = result.league
    save.league.activeProposals = save.league.activeProposals.filter(
      (p) => p.id !== proposalId,
    )

    save.league.news = [
      ...save.league.news,
      createTradeCompletedEvent(proposal, save.league),
    ]

    set({ save: { ...save } })
    get().scheduleAutoSave()
    return { accepted: true }
  },

  findTradesForPlayer: (playerId) => {
    const { save } = get()
    if (!save) return []
    if (save.league.phase === 'free_agency') return []
    const userTeam = save.league.teams[save.league.userTeamId]
    if (!userTeam) return []
    const target = save.league.players[playerId]
    if (!target || !target.teamId) return []
    const targetTeam = save.league.teams[target.teamId]
    if (!targetTeam) return []
    const teamIdMap: Record<string, string> = {}
    teamIdMap[userTeam.id] = userTeam.name
    teamIdMap[targetTeam.id] = targetTeam.name
    save.league.news = [
      ...save.league.news,
      createTradeRumorEvent(
        userTeam.name,
        playerId,
        `${target.firstName} ${target.lastName}`,
        save.league.currentDate,
      ),
    ]
    const proposals = findTradesEngine(userTeam, playerId, save.league, {
      maxResults: 8,
      capFlexibility: 'loose',
    })
    set({ save: { ...save } })
    get().scheduleAutoSave()
    return proposals
  },
}))

function reconcileSides(proposal: TradeProposal): void {
  for (const side of proposal.sides) {
    side.incoming = []
  }
  for (const side of proposal.sides) {
    for (const asset of side.outgoing) {
      const targetId = resolveAssetTarget(proposal, side.teamId, asset)
      if (!targetId) continue
      const target = proposal.sides.find((s) => s.teamId === targetId)
      if (target) {
        target.incoming.push({ ...asset })
      }
    }
  }
}

function resolveAssetTarget(
  proposal: TradeProposal,
  fromTeamId: string,
  asset: TradeAsset,
): string | null {
  if (asset.toTeamId) {
    if (asset.toTeamId === fromTeamId) return null
    if (!proposal.sides.some((s) => s.teamId === asset.toTeamId)) return null
    return asset.toTeamId
  }
  return inferTargetTeamId(proposal, fromTeamId)
}

function inferTargetTeamId(
  proposal: TradeProposal,
  fromTeamId: string,
): string | null {
  const otherSides = proposal.sides.filter((s) => s.teamId !== fromTeamId)
  if (otherSides.length === 1) return otherSides[0]!.teamId
  return null
}

function isAssetDuplicate(outgoing: TradeAsset[], candidate: TradeAsset): boolean {
  if (candidate.type === 'cash') return false
  if (candidate.type === 'player' && candidate.playerId) {
    return outgoing.some(
      (a) => a.type === 'player' && a.playerId === candidate.playerId,
    )
  }
  if (candidate.type === 'pick' && candidate.pickId) {
    return outgoing.some(
      (a) => a.type === 'pick' && a.pickId === candidate.pickId,
    )
  }
  if (candidate.type === 'exception' && candidate.exceptionId) {
    return outgoing.some(
      (a) => a.type === 'exception' && a.exceptionId === candidate.exceptionId,
    )
  }
  return false
}

function countRemainingPlayoffGames(bracket: import('@/game/models/playoff').PlayoffBracket): number {
  let count = 0
  const allSeries = [...bracket.east, ...bracket.west]
  if (bracket.finals) allSeries.push(bracket.finals)

  for (const s of allSeries) {
    if (s.status === 'final') continue
    if (!s.higherSeedTeamId || !s.lowerSeedTeamId) continue
    const required = Math.ceil(s.seriesLength / 2)
    const leaderWins = Math.max(s.higherSeedWins, s.lowerSeedWins)
    const remaining = Math.max(0, required - leaderWins)
    count += remaining
  }
  return count
}

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
