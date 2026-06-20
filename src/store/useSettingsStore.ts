import { create } from 'zustand'
import type { GameSettings } from '@/game/models'

interface SettingsStore {
  settings: GameSettings
  updateSettings: (partial: Partial<GameSettings>) => void
}

const STORAGE_KEY = 'dd-settings'

function loadPersistedSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as GameSettings
    }
  } catch {
    // ignore
  }
  return defaultSettings()
}

function defaultSettings(): GameSettings {
  return {
    difficulty: 'pro',
    simSpeed: 'balanced',
    autoSave: true,
    injuries: true,
    fatigue: true,
    salaryCap: true,
    startSeason: '2025-26',
    snapshotId: 'nba-2025-26',
  }
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
