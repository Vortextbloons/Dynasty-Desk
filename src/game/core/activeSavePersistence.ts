const STORAGE_KEY = 'dd-active-save-id'

export function getActiveSaveId(): string | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    return id && id.length > 0 ? id : null
  } catch {
    return null
  }
}

export function setActiveSaveId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Ignore storage quota / privacy mode errors.
  }
}

export function clearActiveSaveId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
}
