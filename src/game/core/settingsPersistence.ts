import type { GameSettings, SimSpeed } from '@/game/models'

const validDifficulties = new Set<GameSettings['difficulty']>([
  'rookie',
  'pro',
  'all_star',
  'superstar',
  'hall_of_fame',
])

const validSimSpeeds = new Set<SimSpeed>([
  'instant',
  'normal',
  'slow',
  'balanced',
  'fast',
])

const legacySimSpeedMap: Record<string, SimSpeed> = {
  slow: 'normal',
  balanced: 'normal',
  fast: 'instant',
}

export function migrateSimSpeed(value: unknown): SimSpeed {
  if (typeof value === 'string') {
    const legacy = legacySimSpeedMap[value]
    if (legacy) return legacy
    if (validSimSpeeds.has(value as SimSpeed)) return value as SimSpeed
  }
  return 'normal'
}

export type ModernSimSpeed = 'instant' | 'normal'

export function normalizeModernSimSpeed(value: unknown): ModernSimSpeed {
  const migrated = migrateSimSpeed(value)
  return migrated === 'instant' ? 'instant' : 'normal'
}

export function defaultSettings(): GameSettings {
  return {
    difficulty: 'pro',
    simSpeed: 'normal',
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
    validSimSpeeds.has(value.simSpeed as SimSpeed) &&
    typeof value.autoSave === 'boolean' &&
    typeof value.injuries === 'boolean' &&
    typeof value.fatigue === 'boolean' &&
    typeof value.salaryCap === 'boolean' &&
    typeof value.startSeason === 'string' &&
    typeof value.snapshotId === 'string'
  )
}

function normalizeSettings(value: GameSettings): GameSettings {
  return {
    difficulty: value.difficulty,
    simSpeed: migrateSimSpeed(value.simSpeed),
    autoSave: value.autoSave,
    injuries: value.injuries,
    fatigue: value.fatigue,
    salaryCap: value.salaryCap,
    startSeason: value.startSeason,
    snapshotId: value.snapshotId,
  }
}

export function parsePersistedSettings(raw: string | null): GameSettings {
  if (!raw) return defaultSettings()

  try {
    const parsed: unknown = JSON.parse(raw)
    const normalized: GameSettings = isGameSettings(parsed)
      ? normalizeSettings(parsed)
      : defaultSettings()
    return normalized
  } catch {
    return defaultSettings()
  }
}
