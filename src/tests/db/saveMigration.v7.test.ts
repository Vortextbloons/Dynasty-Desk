import { describe, it, expect } from 'vitest'
import { migrateToV7, migrateToCurrent } from '@/db/saveMigration'
import { migrateToV6 } from '@/db/saveMigration'

describe('migrateToV7', () => {
  it('hydrates M10 fields from v6-shaped save', () => {
    const v6 = {
      metadata: {
        id: '1',
        name: 'Test',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        appVersion: '0.1.0',
        schemaVersion: 6,
        teamId: 't1',
        teamName: 'Team',
        currentSeason: 2025,
        currentDate: '2026-01-01',
        leagueName: 'Test',
        snapshotId: 'snap',
      },
      league: {
        id: 'l1',
        name: 'Test',
        currentDate: '2026-01-01',
        seasonYear: 2025,
        phase: 'regular_season',
        rules: {},
        eraConfig: {},
        snapshotId: 'snap',
        teams: { t1: { id: 't1', roster: [] } },
        players: {},
        games: {},
        standings: {},
        scheduleGenerated: false,
        transactions: [],
        news: [],
        awardsHistory: [],
        draftPicks: [],
        draftClasses: {},
        champions: [],
        awards: [],
        activeProposals: [],
        userTeamId: 't1',
      },
      user: { managerName: 'GM', teamId: 't1' },
      settings: {},
      rngState: { seed: 1, position: 0 },
    }

    const v7 = migrateToV7(v6)
    expect(v7.metadata.schemaVersion).toBe(7)
    expect(v7.league.drafts).toEqual({})
    expect(v7.league.freeAgentOffers).toEqual([])
    expect(v7.league.rosterSizeCap).toBe(15)
    expect(v7.league.teams.t1?.twoWayPlayers).toEqual([])
  })

  it('migrateToCurrent reaches v7 from v6', () => {
    const v6save = migrateToV6({
      metadata: { schemaVersion: 5, id: '1', name: 'T', createdAt: '', updatedAt: '', appVersion: '0.1.0', teamId: 't1', teamName: 'T', currentSeason: 2025, currentDate: '', leagueName: 'T', snapshotId: 's' },
      league: { id: 'l', name: 'L', currentDate: '', seasonYear: 2025, phase: 'regular_season', rules: {}, eraConfig: {}, snapshotId: 's', teams: {}, players: {}, games: {}, standings: {}, transactions: [], news: [], awardsHistory: [], draftPicks: [], draftClasses: {}, champions: [], awards: [], userTeamId: 't1' },
      user: { managerName: 'G', teamId: 't1' },
      settings: {},
      rngState: { seed: 1, position: 0 },
    })
    const result = migrateToCurrent(v6save)
    expect(result.metadata.schemaVersion).toBe(8)
  })
})
