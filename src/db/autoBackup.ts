import type { GameSave } from '@/game/models/save'
import { db } from '@/db/dexie'

export async function createBackup(save: GameSave): Promise<string> {
  const backupId = `backup-${save.metadata.id}`
  const now = new Date().toISOString()

  await db.backups.put({
    id: backupId,
    saveId: save.metadata.id,
    data: structuredClone(save),
    createdAt: now,
  })

  return now
}

export async function restoreFromBackup(saveId: string): Promise<GameSave | null> {
  const backupId = `backup-${saveId}`
  const backup = await db.backups.get(backupId)
  if (!backup) return null
  return structuredClone(backup.data)
}

export async function backupExists(saveId: string): Promise<boolean> {
  const backupId = `backup-${saveId}`
  const backup = await db.backups.get(backupId)
  return !!backup
}

export async function deleteBackup(saveId: string): Promise<void> {
  const backupId = `backup-${saveId}`
  await db.backups.delete(backupId)
}
