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

const db = new Dexie('DynastyDeskDB') as Dexie & {
  saves: EntityTable<SaveRow, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
}

db.version(1).stores({
  saves: 'id, updatedAt, teamId, seasonYear',
  settings: 'key',
})

export { db }

export async function initDB(): Promise<void> {
  await db.open()
}
