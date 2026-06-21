// Note: M2 spec originally defined a separate save_metadata table, but it was
// simplified to a denormalized column on the saves table for query efficiency.
// All metadata fields are accessed via the saves store directly.
import Dexie, { type EntityTable } from 'dexie'
import type { GameSave, SaveMetadata } from '@/game/models'

export interface SaveRow {
  id: string
  updatedAt: string
  teamId: string
  seasonYear: number
  data: GameSave
  metadata: SaveMetadata
}

export interface SettingsRow {
  key: string
  value: unknown
}

export interface BackupRow {
  id: string
  saveId: string
  data: GameSave
  createdAt: string
}

const db = new Dexie('DynastyDeskDB') as Dexie & {
  saves: EntityTable<SaveRow, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
  backups: EntityTable<BackupRow, 'id'>
}

db.version(1).stores({
  saves: 'id, updatedAt, teamId, seasonYear',
  settings: 'key',
})

db.version(2).stores({
  saves: 'id, updatedAt, teamId, seasonYear',
  settings: 'key',
  backups: 'id, saveId, createdAt',
})

export { db }

export async function initDB(): Promise<void> {
  await db.open()
}
