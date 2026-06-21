// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { migrateToV9, migrateToCurrent } from '@/db/saveMigration'

describe('migrateToV9', () => {
  const v8Save = {
    metadata: {
      schemaVersion: 8,
      id: '1',
      name: 'T',
      createdAt: '',
      updatedAt: '',
      appVersion: '0.1.0',
      teamId: 't1',
      teamName: 'T',
      currentSeason: 2025,
      currentDate: '',
      leagueName: 'T',
      snapshotId: 's',
    },
    league: {
      id: 'l1',
      name: 'L',
      currentDate: '2025-10-01',
      seasonYear: 2025,
      phase: 'regular_season',
      rules: {},
      eraConfig: {},
      snapshotId: 's',
      teams: {},
      players: {},
      games: {},
      standings: {},
      transactions: [],
      news: [],
      awardsHistory: [],
      draftPicks: [],
      draftClasses: {},
      champions: [],
      awards: [],
      userTeamId: 't1',
    },
    user: { managerName: 'M', teamId: 't1' },
    settings: {},
    rngState: { seed: 'x', position: 0 },
  }

  it('adds notes to metadata', () => {
    const v9 = migrateToV9(v8Save)
    expect(v9.metadata.schemaVersion).toBe(9)
    expect(v9.metadata.notes).toBe('')
  })

  it('preserves existing notes string', () => {
    const withNotes = {
      ...v8Save,
      metadata: { ...v8Save.metadata, notes: 'my save notes' },
    }
    const v9 = migrateToV9(withNotes)
    expect(v9.metadata.notes).toBe('my save notes')
  })

  it('adds rivalries, records, hallOfFame to league', () => {
    const v9 = migrateToV9(v8Save)
    expect(v9.league.rivalries).toEqual({})
    expect(v9.league.records).toEqual([])
    expect(v9.league.hallOfFame).toEqual([])
  })

  it('preserves existing league fields', () => {
    const withExtras = {
      ...v8Save,
      league: {
        ...v8Save.league,
        rivalries: { r1: { teamA: 't1', teamB: 't2', intensity: 5 } },
        records: [{ id: 'rec1', season: '2024-25' }],
        hallOfFame: [{ id: 'hof1', playerId: 'p1', inductionYear: 2025 }],
      },
    }
    const v9 = migrateToV9(withExtras)
    expect(v9.league.rivalries).toEqual(withExtras.league.rivalries)
    expect(v9.league.records).toEqual(withExtras.league.records)
    expect(v9.league.hallOfFame).toEqual(withExtras.league.hallOfFame)
  })

  it('migrateToCurrent reaches v9 from v8', () => {
    const result = migrateToCurrent(v8Save)
    expect(result.metadata.schemaVersion).toBe(9)
    expect(result.metadata.notes).toBe('')
    expect(result.league.rivalries).toEqual({})
    expect(result.league.records).toEqual([])
    expect(result.league.hallOfFame).toEqual([])
  })
})
