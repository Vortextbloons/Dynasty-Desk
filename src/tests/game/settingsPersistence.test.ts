// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  defaultSettings,
  parsePersistedSettings,
} from '@/game/core/settingsPersistence'
import type { GameSettings } from '@/game/models'

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

  it('returns defaults for partial data', () => {
    expect(
      parsePersistedSettings(
        JSON.stringify({ difficulty: 'superstar', autoSave: true }),
      ),
    ).toEqual(defaultSettings())
  })

  it('drops unknown fields from valid payloads', () => {
    const parsed = parsePersistedSettings(
      JSON.stringify({
        ...defaultSettings(),
        extraFlag: true,
      }),
    ) as GameSettings & { extraFlag?: boolean }

    expect(parsed).toEqual(defaultSettings())
    expect(parsed).not.toHaveProperty('extraFlag')
  })

  it('rejects type-coerced values', () => {
    expect(
      parsePersistedSettings(
        JSON.stringify({
          ...defaultSettings(),
          autoSave: 'true',
        }),
      ),
    ).toEqual(defaultSettings())
  })

  it('returns parsed settings when payload is valid', () => {
    const settings = defaultSettings()
    settings.difficulty = 'superstar'
    settings.simSpeed = 'fast'
    settings.autoSave = false

    expect(parsePersistedSettings(JSON.stringify(settings))).toEqual({
      ...settings,
      simSpeed: 'instant',
    })
  })

  it('normalizes legacy slow simSpeed to normal on parse', () => {
    const settings = { ...defaultSettings(), simSpeed: 'slow' as const }
    expect(parsePersistedSettings(JSON.stringify(settings)).simSpeed).toBe('normal')
  })
})
