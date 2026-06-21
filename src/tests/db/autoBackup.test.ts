// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll } from 'vitest'
import { createBackup, restoreFromBackup, deleteBackup, backupExists } from '@/db/autoBackup'
import { initDB } from '@/db/dexie'
import type { GameSave, LeagueRules, EraConfig } from '@/game/models'

beforeAll(async () => {
  await initDB()
})

function makeTestSave(id = 'test-save-1'): GameSave {
  return {
    metadata: {
      id,
      name: 'Test Dynasty',
      createdAt: '2025-10-21T00:00:00.000Z',
      updatedAt: '2025-10-21T00:00:00.000Z',
      appVersion: '0.1.0',
      schemaVersion: 9,
      teamId: 'team-1',
      teamName: 'Lakers',
      currentSeason: 2025,
      currentDate: '2025-10-21',
      leagueName: 'Test Dynasty',
      snapshotId: 'nba-2025-26',
      notes: '',
    },
    league: {
      id: 'league-1',
      name: 'Test Dynasty',
      currentDate: '2025-10-21',
      seasonYear: 2025,
      phase: 'regular_season',
      rules: {} as LeagueRules,
      eraConfig: {} as EraConfig,
      snapshotId: 'nba-2025-26',
      teams: {},
      players: {},
      games: {},
      standings: {},
      scheduleGenerated: false,
      transactions: [],
      news: [],
      awardsHistory: [],
      draftPicks: [],
      draftClasses: {},
      drafts: {},
      scoutingState: {},
      freeAgentOffers: [],
      qualifyingOffers: [],
      compensationPicks: [],
      offseasonLog: [],
      rosterSizeCap: 15,
      champions: [],
      awards: [],
      activeProposals: [],
      rivalries: {},
      records: [],
      hallOfFame: [],
      userTeamId: 'team-1',
    },
    user: { managerName: 'GM', teamId: 'team-1' },
    settings: {
      difficulty: 'pro',
      simSpeed: 'instant',
      autoSave: true,
      injuries: true,
      fatigue: true,
      salaryCap: true,
      startSeason: '2025-26',
      snapshotId: 'nba-2025-26',
    },
    rngState: { seed: 'test', position: 0 },
  }
}

describe('autoBackup', () => {
  it('createBackup returns a timestamp string', async () => {
    const save = makeTestSave()
    const timestamp = await createBackup(save)
    expect(typeof timestamp).toBe('string')
    expect(timestamp.length).toBeGreaterThan(0)
  })

  it('restoreFromBackup returns a deep clone of the backed-up save', async () => {
    const save = makeTestSave()
    await createBackup(save)
    const restored = await restoreFromBackup('test-save-1')
    expect(restored).not.toBeNull()
    expect(restored!.metadata.id).toBe('test-save-1')
    expect(restored!.metadata.name).toBe('Test Dynasty')
    expect(restored!.league.id).toBe('league-1')
  })

  it('restored save is a deep clone (modifying one does not affect the other)', async () => {
    const save = makeTestSave()
    await createBackup(save)
    const restored = await restoreFromBackup('test-save-1')
    restored!.metadata.name = 'Modified'
    const restored2 = await restoreFromBackup('test-save-1')
    expect(restored2!.metadata.name).toBe('Test Dynasty')
  })

  it('backupExists returns true after createBackup', async () => {
    const save = makeTestSave('exists-check')
    expect(await backupExists('exists-check')).toBe(false)
    await createBackup(save)
    expect(await backupExists('exists-check')).toBe(true)
  })

  it('deleteBackup removes the backup', async () => {
    const save = makeTestSave('delete-check')
    await createBackup(save)
    expect(await backupExists('delete-check')).toBe(true)
    await deleteBackup('delete-check')
    expect(await backupExists('delete-check')).toBe(false)
  })

  it('restoreFromBackup returns null for non-existent save', async () => {
    const result = await restoreFromBackup('non-existent-id')
    expect(result).toBeNull()
  })
})
