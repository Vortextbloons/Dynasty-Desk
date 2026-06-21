// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { migrateToV8, migrateToCurrent } from '@/db/saveMigration'

describe('migrateToV8', () => {
  it('hydrates M11 player and team fields', () => {
    const v7 = {
      metadata: {
        schemaVersion: 7,
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
        teams: {
          t1: {
            id: 't1',
            roster: ['p1'],
            lineup: { starters: [], bench: [], closingLineup: [], targetMinutes: {}, autoRotation: true },
          },
        },
        players: {
          p1: {
            id: 'p1',
            health: { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0 },
            development: { focusArea: 'shooting' },
          },
        },
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

    const v8 = migrateToV8(v7)
    expect(v8.metadata.schemaVersion).toBe(8)
    expect(v8.league.players.p1?.fatigue).toBe(0)
    expect(v8.league.players.p1?.health.injuryHistory).toEqual([])
    expect(v8.league.players.p1?.development.trainingFocus).toBe('shooting')
    expect(v8.league.teams.t1?.trainingFocus).toBe('balanced')
    expect(v8.league.teams.t1?.loadManagement).toEqual([])
    expect(v8.settings.injuries).toBe(true)
    expect(v8.settings.fatigue).toBe(true)
  })

  it('migrateToCurrent ends at v8', () => {
    const result = migrateToCurrent({
      metadata: { schemaVersion: 7, id: '1', name: 'T', createdAt: '', updatedAt: '', appVersion: '0.1.0', teamId: 't1', teamName: 'T', currentSeason: 2025, currentDate: '', leagueName: 'T', snapshotId: 's' },
      league: { id: 'l', name: 'L', currentDate: '', seasonYear: 2025, phase: 'regular_season', rules: {}, eraConfig: {}, snapshotId: 's', teams: {}, players: {}, games: {}, standings: {}, transactions: [], news: [], awardsHistory: [], draftPicks: [], draftClasses: {}, champions: [], awards: [], userTeamId: 't1' },
      user: { managerName: 'M', teamId: 't1' },
      settings: {},
      rngState: { seed: 'x', position: 0 },
    })
    expect(result.metadata.schemaVersion).toBe(9)
  })
})
