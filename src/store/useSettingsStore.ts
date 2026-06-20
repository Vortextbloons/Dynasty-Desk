import { create } from 'zustand'
import type { GameSettings } from '@/game/models'
import { parsePersistedSettings } from '@/game/core/settingsPersistence'

interface SettingsStore {
  settings: GameSettings
  updateSettings: (partial: Partial<GameSettings>) => void
}

const STORAGE_KEY = 'dd-settings'

function loadPersistedSettings(): GameSettings {
  return parsePersistedSettings(localStorage.getItem(STORAGE_KEY))
}

function persistSettings(settings: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: loadPersistedSettings(),
  updateSettings: (partial) => {
    set((state) => {
      const next = { ...state.settings, ...partial }
      persistSettings(next)
      return { settings: next }
    })
  },
}))
