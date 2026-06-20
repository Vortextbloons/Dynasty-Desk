import { describe, it, expect } from 'vitest'
import { validateSave } from '@/game/core/saveValidation'
import type { GameSave } from '@/game/models'

function makeValidSave(): GameSave {
  return {
    metadata: {
      id: 'test-save-1',
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
        seasonLabel: '2025-26',
        teamCount: 30,
        regularSeasonGames: 82,
        playoffTeamsPerConference: 8,
        playoffSeriesLength: 7,
        salaryCapEnabled: true,
        salaryCap: 140000000,
        luxuryTaxEnabled: true,
        maxRosterSize: 15,
        minRosterSize: 13,
        maxContractYears: 5,
        draftRounds: 2,
        threePointLineDistance: 23.75,
        playoffFormat: 'playin_then_top8',
        hasPlayIn: true,
      },
      eraConfig: {
        season: '2025-26',
        pace: 100,
        league3PARate: 0.39,
        leagueTsPct: 0.58,
        leaguePpg: 114.7,
        possessionCoefficient: 1.0,
      },
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
          finances: {
            salaryCap: 140000000,
            payroll: 120000000,
            luxuryTaxLine: 170000000,
            capSpace: 20000000,
            taxBill: 0,
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
          ratings: {
            insideScoring: 82,
            closeShot: 78,
            midrange: 72,
            threePoint: 74,
            freeThrow: 75,
            ballHandling: 80,
            passing: 92,
            offensiveIq: 95,
            offensiveRebound: 45,
            defensiveRebound: 65,
            perimeterDefense: 70,
            interiorDefense: 60,
            steal: 55,
            block: 40,
            defensiveIq: 85,
            speed: 72,
            strength: 80,
            vertical: 65,
            stamina: 80,
            durability: 85,
            clutch: 90,
            consistency: 88,
            potential: 40,
          },
          tendencies: {
            usageRate: 28,
            passRate: 20,
            shotRate: 25,
            driveRate: 15,
            postUpRate: 5,
            rimFrequency: 30,
            shortMidFrequency: 10,
            longMidFrequency: 10,
            cornerThreeFrequency: 5,
            aboveBreakThreeFrequency: 30,
            threePointRate: 35,
            freeThrowRate: 25,
            turnoverRate: 10,
            isolationRate: 10,
            pickAndRollBallHandlerRate: 20,
            pickAndRollRollManRate: 5,
            spotUpRate: 15,
            transitionRate: 15,
            cutRate: 5,
            foulRate: 2,
            stealAttemptRate: 5,
            blockAttemptRate: 3,
            crashOffensiveGlassRate: 8,
          },
          traits: {
            workEthic: 85,
            loyalty: 70,
            ego: 60,
            greed: 40,
            leadership: 90,
            coachability: 80,
            injuryRisk: 30,
            shotCreation: 85,
            defensiveVersatility: 70,
          },
          contract: {
            salaryByYear: [50000000],
            yearsRemaining: 1,
            option: 'none',
            noTradeClause: false,
            guaranteed: true,
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
    rngState: {
      seed: 'test-seed-123',
      position: 0,
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tamper(obj: any, path: string, value: unknown) {
  const parts = path.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (key !== undefined) current = current[key]
  }
  const lastKey = parts[parts.length - 1]
  if (lastKey !== undefined) current[lastKey] = value
}

describe('validateSave', () => {
  it('accepts a valid save', () => {
    const save = makeValidSave()
    const result = validateSave(save)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.metadata.id).toBe('test-save-1')
    }
  })

  it('rejects non-object input', () => {
    const result = validateSave(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('not a valid JSON object')
    }
  })

  it('rejects missing metadata', () => {
    const save = makeValidSave() as unknown as Record<string, unknown>
    delete save.metadata
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('metadata')
    }
  })

  it('rejects missing league', () => {
    const save = makeValidSave() as unknown as Record<string, unknown>
    delete save.league
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('league')
    }
  })

  it('rejects missing settings', () => {
    const save = makeValidSave() as unknown as Record<string, unknown>
    delete save.settings
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('settings')
    }
  })

  it('rejects missing rngState', () => {
    const save = makeValidSave() as unknown as Record<string, unknown>
    delete save.rngState
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('RNG')
    }
  })

  it('rejects unsupported schema version', () => {
    const save = makeValidSave()
    tamper(save, 'metadata.schemaVersion', 99)
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('Unsupported save version')
      expect(result.reason).toContain('99')
    }
  })

  it('rejects missing appVersion', () => {
    const save = makeValidSave()
    tamper(save, 'metadata.appVersion', undefined)
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('app version')
    }
  })

  it('rejects invalid teamId in metadata', () => {
    const save = makeValidSave()
    tamper(save, 'metadata.teamId', 123)
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('teamId')
    }
  })

  it('rejects league with no teams', () => {
    const save = makeValidSave()
    save.league.teams = {}
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('no teams')
    }
  })

  it('rejects userTeamId not matching any team', () => {
    const save = makeValidSave()
    save.league.userTeamId = 'nonexistent-team'
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('nonexistent-team')
    }
  })

  it('rejects team with missing roster', () => {
    const save = makeValidSave()
    delete (save.league.teams['team-1'] as unknown as Record<string, unknown>).roster
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('roster')
    }
  })

  it('rejects player with invalid teamId', () => {
    const save = makeValidSave()
    const player = save.league.players['player-1']
    if (player) player.teamId = 'nonexistent' as never
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('non-existent team')
    }
  })

  it('accepts player with null teamId (free agent)', () => {
    const save = makeValidSave()
    const player = save.league.players['player-1']
    if (player) player.teamId = null
    const result = validateSave(save)
    expect(result.ok).toBe(true)
  })

  it('rejects non-array news', () => {
    const save = makeValidSave()
    tamper(save, 'league.news', 'not an array')
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('news')
    }
  })

  it('rejects missing user', () => {
    const save = makeValidSave() as unknown as Record<string, unknown>
    delete save.user
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('user')
    }
  })

  it('rejects user missing managerName', () => {
    const save = makeValidSave()
    tamper(save, 'user.managerName', undefined)
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('managerName')
    }
  })

  it('rejects user missing teamId', () => {
    const save = makeValidSave()
    tamper(save, 'user.teamId', undefined)
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('teamId')
    }
  })
})
