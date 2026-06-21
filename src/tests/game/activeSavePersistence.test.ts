// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearActiveSaveId,
  getActiveSaveId,
  setActiveSaveId,
} from '@/game/core/activeSavePersistence'

function createStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

describe('activeSavePersistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when no active save is stored', () => {
    vi.stubGlobal('localStorage', createStorage())
    expect(getActiveSaveId()).toBeNull()
  })

  it('persists and reads the active save id', () => {
    vi.stubGlobal('localStorage', createStorage())
    setActiveSaveId('save-123')
    expect(getActiveSaveId()).toBe('save-123')
  })

  it('clears the active save id', () => {
    vi.stubGlobal('localStorage', createStorage())
    setActiveSaveId('save-123')
    clearActiveSaveId()
    expect(getActiveSaveId()).toBeNull()
  })

  it('treats empty stored values as null', () => {
    const storage = createStorage()
    storage.setItem('dd-active-save-id', '')
    vi.stubGlobal('localStorage', storage)
    expect(getActiveSaveId()).toBeNull()
  })
})
