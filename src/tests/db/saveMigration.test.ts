import { describe, it, expect } from 'vitest'
import { migrateToV2 } from '@/db/saveMigration'
import type { GameSave } from '@/game/models'

function makeV1Save(): any {
  return {
    metadata: {
      id: 'test-save',
      name: 'Test Dynasty',
      createdAt: '2025-10-21T00:00:00.000Z',
      updatedAt: '2025-10-21T00:00:00.000Z',
      appVersion: '0.1.0',
      schemaVersion: 1,
      teamId: 'team-1',
      teamName: 'Lakers',
      currentSeason: 2025,
      currentDate: '2025-10-21',
      leagueName: 'Test Dynasty',
      snapshotId: 'nba-2025-26',
    },
    league: {
      id: 'league-1',
      name: 'Test Dynasty',
      currentDate: '2025-10-21',
      seasonYear: 2025,
      phase: 'regular_season',
      rules: {
        salaryCap: 140_588_000,
        apron: 178_132_000,
        secondApron: 189_502_000,
        luxuryTaxLine: 171_314_000,
      },
      eraConfig: { season: '2025-26' },
      snapshotId: 'nba-2025-26',
      teams: {
        'team-1': {
          id: 'team-1',
          city: 'Los Angeles',
          name: 'Lakers',
          abbreviation: 'LAL',
          conference: 'West',
          division: 'Pacific',
          colors: { primary: '#552583', secondary: '#FDB927' },
          roster: ['player-1'],
          lineup: {
            starters: ['player-1'],
            bench: [],
            closingLineup: ['player-1'],
            targetMinutes: {},
            autoRotation: true,
          },
          strategy: {
            offense: {
              pace: 'balanced',
              shotProfile: 'balanced',
              primaryAction: 'pick_and_roll',
              usageDistribution: 'balanced',
              crashOffensiveGlass: 'medium',
            },
            defense: {
              pickAndRollCoverage: 'drop',
              helpDefense: 'balanced',
              pressure: 'medium',
              reboundingFocus: 'balanced',
              physicality: 'balanced',
            },
          },
          direction: 'contender',
          chemistry: 75,
          morale: 65,
          prestige: 80,
        },
      },
      players: {
        'player-1': {
          id: 'player-1',
          firstName: 'LeBron',
          lastName: 'James',
          age: 40,
          position: 'SF',
          secondaryPositions: [],
          heightInches: 81,
          weightLbs: 250,
          teamId: 'team-1',
          ratings: {},
          tendencies: {},
          traits: {},
          contract: {
            salaryByYear: [50_000_000],
            yearsRemaining: 1,
            option: 'none',
            optionYear: null,
            noTradeClause: false,
            signingBonusByYear: [0],
            likelyBonusesByYear: [0],
            unlikelyBonusesByYear: [0],
            guaranteed: true,
            guaranteedByYear: [true],
            tradeKickers: [],
            poisonPill: false,
            birdRights: false,
            earlyBird: false,
            baseYearCompensation: false,
            deferredMoney: [],
          },
          morale: { level: 70, happiness: 75, tradeRequest: false },
          health: {
            status: 'healthy',
            injuryDescription: null,
            gamesRemaining: 0,
          },
          development: {
            lastTrainedAt: null,
            focusArea: null,
            recentForm: 50,
          },
          seasonStats: {
            season: '2025-26',
            teamId: 'team-1',
            gamesPlayed: 0,
            minutes: 0,
            points: 0,
            rebounds: 0,
            assists: 0,
            steals: 0,
            blocks: 0,
            turnovers: 0,
            fieldGoalsMade: 0,
            fieldGoalsAttempted: 0,
            threePointersMade: 0,
            threePointersAttempted: 0,
            freeThrowsMade: 0,
            freeThrowsAttempted: 0,
            plusMinus: 0,
          },
          careerStats: [],
          historicalSeasons: [],
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
      userTeamId: 'team-1',
    },
    user: { managerName: 'Coach', teamId: 'team-1' },
    settings: {
      difficulty: 'pro',
      simSpeed: 'balanced',
      autoSave: true,
      injuries: true,
      fatigue: true,
      salaryCap: true,
      startSeason: '2025-26',
      snapshotId: 'nba-2025-26',
    },
    rngState: { seed: 'test-seed', position: 0 },
  }
}

describe('migrateToV2', () => {
  it('v1 save loads as v2 with hydrated finances', () => {
    const v1 = makeV1Save()
    const result = migrateToV2(v1) as GameSave

    expect(result.metadata.schemaVersion).toBe(2)

    const team = result.league.teams['team-1']
    expect(team).toBeDefined()
    expect(team!.finances).toBeDefined()
    expect(team!.finances.salaryCap).toBe(140_588_000)
    expect(team!.finances.apron).toBe(178_132_000)
    expect(team!.finances.secondApron).toBe(189_502_000)
    expect(team!.finances.luxuryTaxLine).toBe(171_314_000)
  })

  it('computes payroll from league.players via roster', () => {
    const v1 = makeV1Save()
    const result = migrateToV2(v1) as GameSave

    const team = result.league.teams['team-1']
    // Player has $50M salary in year 0, lives in league.players
    expect(team!.finances.payroll).toBe(50_000_000)
  })

  it('sets capSpace = salaryCap - payroll', () => {
    const v1 = makeV1Save()
    const result = migrateToV2(v1) as GameSave

    const team = result.league.teams['team-1']
    expect(team!.finances.capSpace).toBe(140_588_000 - 50_000_000)
  })

  it('initializes default financial fields', () => {
    const v1 = makeV1Save()
    const result = migrateToV2(v1) as GameSave

    const team = result.league.teams['team-1']
    expect(team!.finances.taxBill).toBe(0)
    expect(team!.finances.projectedTaxBill).toBe(0)
    expect(team!.finances.baseRevenue).toBe(0)
    expect(team!.finances.localRevenue).toBe(0)
    expect(team!.finances.seasonPerformanceBonus).toBe(0)
    expect(team!.finances.totalRevenue).toBe(0)
    expect(team!.finances.netIncome).toBe(0)
    expect(team!.finances.exceptionsUsed.mle).toBe(false)
    expect(team!.finances.exceptionsUsed.bae).toBe(false)
    expect(team!.finances.exceptionsUsed.roomMle).toBe(false)
    expect(team!.finances.exceptionsUsed.minimumCount).toBe(0)
  })

  it('preserves existing ownerCash and cashReserves', () => {
    const v1 = makeV1Save()
    v1.league.teams['team-1'].finances = { ownerCash: 75_000_000, cashReserves: 200_000_000 }
    const result = migrateToV2(v1) as GameSave

    const team = result.league.teams['team-1']
    expect(team!.finances.ownerCash).toBe(75_000_000)
    expect(team!.finances.cashReserves).toBe(200_000_000)
  })

  it('defaults ownerCash and cashReserves when not present', () => {
    const v1 = makeV1Save()
    const result = migrateToV2(v1) as GameSave

    const team = result.league.teams['team-1']
    expect(team!.finances.ownerCash).toBe(50_000_000)
    expect(team!.finances.cashReserves).toBe(100_000_000)
    expect(team!.finances.ownerPatience).toBe(70)
  })

  it('v2 save roundtrips (no error on re-migration)', () => {
    const v1 = makeV1Save()
    const v2 = migrateToV2(v1) as GameSave

    // Re-migrating a v2 save should still work (schemaVersion becomes 2 again)
    const v2Again = migrateToV2(v2 as any) as GameSave
    expect(v2Again.metadata.schemaVersion).toBe(2)
    expect(v2Again.league.teams['team-1']!.finances.payroll).toBe(
      v2.league.teams['team-1']!.finances.payroll,
    )
  })

  it('corrupt v1 with negative salary produces negative payroll', () => {
    const v1 = makeV1Save()
    v1.league.players['player-1'].contract.salaryByYear = [-5_000_000]
    v1.league.teams['team-1'].players = {
      'player-1': v1.league.players['player-1'],
    }
    const result = migrateToV2(v1) as GameSave

    // Migration does not validate values; negative salary produces negative payroll
    const team = result.league.teams['team-1']
    expect(team!.finances.payroll).toBe(-5_000_000)
  })

  it('handles team with no roster', () => {
    const v1 = makeV1Save()
    v1.league.teams['team-1'].roster = []
    v1.league.players = {}
    const result = migrateToV2(v1) as GameSave

    const team = result.league.teams['team-1']
    expect(team!.finances.payroll).toBe(0)
    expect(team!.finances.capSpace).toBe(140_588_000)
  })

  it('handles multiple teams', () => {
    const v1 = makeV1Save()
    v1.league.teams['team-2'] = {
      ...JSON.parse(JSON.stringify(v1.league.teams['team-1'])),
      id: 'team-2',
      roster: [],
    }
    delete v1.league.players // team-2 has no players
    v1.league.players = v1.league.players || {}

    const result = migrateToV2(v1) as GameSave

    expect(result.league.teams['team-1']).toBeDefined()
    expect(result.league.teams['team-2']).toBeDefined()
    expect(result.league.teams['team-2']!.finances.payroll).toBe(0)
  })
})
