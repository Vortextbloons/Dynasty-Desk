import type { GameSettings } from '@/game/models'

const validDifficulties = new Set<GameSettings['difficulty']>([
  'rookie',
  'pro',
  'all_star',
  'superstar',
  'hall_of_fame',
])

const validSimSpeeds = new Set<GameSettings['simSpeed']>([
  'slow',
  'balanced',
  'fast',
])

export function defaultSettings(): GameSettings {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isGameSettings(value: unknown): value is GameSettings {
  if (!isRecord(value)) return false

  return (
    validDifficulties.has(value.difficulty as GameSettings['difficulty']) &&
    validSimSpeeds.has(value.simSpeed as GameSettings['simSpeed']) &&
    typeof value.autoSave === 'boolean' &&
    typeof value.injuries === 'boolean' &&
    typeof value.fatigue === 'boolean' &&
    typeof value.salaryCap === 'boolean' &&
    typeof value.startSeason === 'string' &&
    typeof value.snapshotId === 'string'
  )
}

export function parsePersistedSettings(raw: string | null): GameSettings {
  if (!raw) return defaultSettings()

  try {
    const parsed: unknown = JSON.parse(raw)
    return isGameSettings(parsed) ? parsed : defaultSettings()
  } catch {
    return defaultSettings()
  }
}
