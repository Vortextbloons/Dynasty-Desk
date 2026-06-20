import { create } from 'zustand'
import type { GameSave, GameSettings } from '@/game/models'
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

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

interface GameStore {
  save: GameSave | null
  saves: SaveMetadata[]
  saveStatus: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  error: string | null
  lastSavedAt: string | null

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
}

export const useGameStore = create<GameStore>()((set, get) => ({
  save: null,
  saves: [],
  saveStatus: 'idle',
  error: null,
  lastSavedAt: null,

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
      if (teamPatch.finances)
        existing.finances = teamPatch.finances as typeof existing.finances
    }
  }
}
