import { create } from 'zustand'
import type { GameSave, GameSettings } from '@/game/models'
import type { SaveMetadata } from '@/game/models'
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
        set({ saveStatus: 'error', error: 'Save not found.' })
        return
      }
      set({
        save,
        saveStatus: 'ready',
        lastSavedAt: save.metadata.updatedAt,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load save'
      set({ saveStatus: 'error', error: msg })
    }
  },

  loadSavesList: async () => {
    try {
      const saves = await dbListSaves()
      set({ saves })
    } catch {
      set({ saves: [] })
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
}))
