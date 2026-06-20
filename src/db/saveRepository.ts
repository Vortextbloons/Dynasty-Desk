import { db, type SaveRow } from './dexie'
import type { GameSave, SaveMetadata } from '@/game/models'
import { validateSave } from '@/game/core/saveValidation'
import { initDB } from './dexie'
import { downloadTextFile } from '@/lib/download'
import { migrateToV2 } from './saveMigration'

let dbInitialized = false

async function ensureDB() {
  if (!dbInitialized) {
    await initDB()
    dbInitialized = true
  }
}

export async function createSave(save: GameSave): Promise<void> {
  await ensureDB()
  const row: SaveRow = {
    id: save.metadata.id,
    updatedAt: save.metadata.updatedAt,
    teamId: save.metadata.teamId,
    seasonYear: save.metadata.currentSeason,
    data: save,
    metadata: save.metadata,
  }
  await db.saves.put(row)
}

export async function loadSave(id: string): Promise<GameSave | null> {
  await ensureDB()
  const row = await db.saves.get(id)
  if (!row?.data) return null

  const raw = row.data as unknown
  const result = validateSave(raw)
  if (!result.ok) return null

  let save = result.save
  if (save.metadata.schemaVersion === 1) {
    save = migrateToV2(save)
    await db.saves.update(id, { data: save, metadata: save.metadata })
  }

  return save
}

export async function listSaves(): Promise<SaveMetadata[]> {
  await ensureDB()
  const rows = await db.saves.toArray()
  return rows
    .map((r) => r.metadata)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
}

export async function deleteSave(id: string): Promise<void> {
  await ensureDB()
  await db.saves.delete(id)
}

export async function duplicateSave(
  id: string,
  newName: string,
): Promise<GameSave | null> {
  await ensureDB()
  const original = await loadSave(id)
  if (!original) return null

  const now = new Date().toISOString()
  const duplicated: GameSave = {
    ...original,
    metadata: {
      ...original.metadata,
      id: crypto.randomUUID(),
      name: newName,
      createdAt: now,
      updatedAt: now,
    },
    league: {
      ...original.league,
      id: crypto.randomUUID(),
      name: newName,
    },
  }

  await createSave(duplicated)
  return duplicated
}

export async function updateSave(save: GameSave): Promise<void> {
  await ensureDB()
  const now = new Date().toISOString()
  save.metadata.updatedAt = now
  save.metadata.currentDate = save.league.currentDate

  const row: SaveRow = {
    id: save.metadata.id,
    updatedAt: now,
    teamId: save.metadata.teamId,
    seasonYear: save.metadata.currentSeason,
    data: save,
    metadata: save.metadata,
  }
  await db.saves.put(row)
}

export async function exportSaveToFile(id: string): Promise<void> {
  const save = await loadSave(id)
  if (!save) throw new Error(`Save not found: ${id}`)

  const json = JSON.stringify(save, null, 2)
  downloadTextFile(
    `${save.metadata.name.replace(/[^a-z0-9]/gi, '_')}.dynasty-desk-save.json`,
    json,
    'application/json',
  )
}

export async function importSaveFromFile(file: File): Promise<GameSave> {
  const text = await file.text()
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file.')
  }

  const result = validateSave(parsed)
  if (!result.ok) {
    throw new Error(result.reason)
  }

  let save = result.save
  if (save.metadata.schemaVersion === 1) {
    save = migrateToV2(save)
  }

  save.metadata.id = crypto.randomUUID()
  save.league.id = crypto.randomUUID()
  save.metadata.createdAt = new Date().toISOString()
  save.metadata.updatedAt = new Date().toISOString()

  await createSave(save)
  return save
}
