import { describe, expect, it } from 'vitest'
import {
  defaultSettings,
  parsePersistedSettings,
} from '@/game/core/settingsPersistence'

describe('settingsPersistence', () => {
  it('returns defaults when storage is empty', () => {
    expect(parsePersistedSettings(null)).toEqual(defaultSettings())
  })

  it('returns defaults for malformed json', () => {
    expect(parsePersistedSettings('{')).toEqual(defaultSettings())
  })

  it('returns defaults for invalid shape', () => {
    expect(parsePersistedSettings(JSON.stringify({ autoSave: 'yes' }))).toEqual(
      defaultSettings(),
    )
  })

  it('returns parsed settings when payload is valid', () => {
    const settings = defaultSettings()
    settings.difficulty = 'superstar'
    settings.simSpeed = 'fast'
    settings.autoSave = false

    expect(parsePersistedSettings(JSON.stringify(settings))).toEqual(settings)
  })
})
