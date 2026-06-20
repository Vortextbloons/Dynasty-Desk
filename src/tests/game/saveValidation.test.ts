import { describe, it, expect } from 'vitest'
import { validateSave } from '@/game/core/saveValidation'
import type { GameSave } from '@/game/models'
import { emptyContract, getLeagueRules, DEFAULT_LEAGUE_RULES } from '@/game/models'

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
      rules: getLeagueRules('2025-26'),
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
            salaryCap: DEFAULT_LEAGUE_RULES.salaryCap,
            apron: DEFAULT_LEAGUE_RULES.apron,
            secondApron: DEFAULT_LEAGUE_RULES.secondApron,
            luxuryTaxLine: DEFAULT_LEAGUE_RULES.luxuryTaxLine,
            payroll: 120_000_000,
            capSpace: 20_588_000,
            taxBill: 0,
            projectedTaxBill: 0,
            baseRevenue: 0,
            localRevenue: 0,
            seasonPerformanceBonus: 0,
            totalRevenue: 0,
            operatingExpenses: 0,
            totalExpenses: 0,
            netIncome: 0,
            ownerCash: 0,
            cashReserves: 0,
            ownerPatience: 70,
            exceptionsUsed: {
              mle: true,
              bae: true,
              roomMle: true,
              minimumCount: 0,
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
            overall: 50,
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
          contract: emptyContract(50_000_000, 1),
          morale: { level: 70, happiness: 75, roleSatisfaction: 75, teamSatisfaction: 75, tradeRequest: false, tradeRequestLevel: 0 },
          health: {
            status: 'healthy',
            injuryDescription: null,
            daysRemaining: 0,
            gamesRemaining: 0,
          },
          development: {
            lastTrainedAt: null,
            focusArea: null,
            recentForm: 50,
            ageAtPeak: 27,
            progressionCurve: 'normal',
            ratingsDelta: {},
            breakoutChance: 0.1,
            bustRisk: 0.1,
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
      scheduleGenerated: false,
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

function asRaw(save: GameSave): Record<string, unknown> {
  return save as unknown as Record<string, unknown>
}

describe('validateSave', () => {
  it('accepts a valid save', () => {
    const result = validateSave(makeValidSave())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.metadata.id).toBe('test-save-1')
    }
  })

  it('rejects non-object input', () => {
    const result = validateSave(null)
    expect(result.ok).toBe(false)
  })

  it('rejects missing metadata', () => {
    const raw = asRaw(makeValidSave())
    delete raw.metadata
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('metadata')
  })

  it('rejects missing league', () => {
    const raw = asRaw(makeValidSave())
    delete raw.league
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('league')
  })

  it('rejects missing settings', () => {
    const raw = asRaw(makeValidSave())
    delete raw.settings
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('settings')
  })

  it('rejects missing rngState', () => {
    const raw = asRaw(makeValidSave())
    delete raw.rngState
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('RNG')
  })

  it('rejects unsupported schema version', () => {
    const raw = asRaw(makeValidSave())
    ;(raw.metadata as Record<string, unknown>).schemaVersion = 99
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('Unsupported save version')
      expect(result.reason).toContain('99')
    }
  })

  it('rejects missing appVersion', () => {
    const raw = asRaw(makeValidSave())
    delete (raw.metadata as Record<string, unknown>).appVersion
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('app version')
  })

  it('rejects invalid teamId in metadata', () => {
    const raw = asRaw(makeValidSave())
    ;(raw.metadata as Record<string, unknown>).teamId = 123
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('teamId')
  })

  it('rejects league with no teams', () => {
    const save = makeValidSave()
    save.league.teams = {}
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('no teams')
  })

  it('rejects userTeamId not matching any team', () => {
    const save = makeValidSave()
    save.league.userTeamId = 'nonexistent-team'
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('nonexistent-team')
  })

  it('rejects team with missing roster', () => {
    const save = makeValidSave()
    const raw = save.league.teams['team-1'] as unknown as Record<string, unknown>
    delete raw.roster
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('roster')
  })

  it('rejects player with invalid teamId', () => {
    const save = makeValidSave()
    const player = save.league.players['player-1']
    if (player) player.teamId = 'nonexistent'
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('non-existent team')
  })

  it('accepts player with null teamId (free agent)', () => {
    const save = makeValidSave()
    const player = save.league.players['player-1']
    if (player) player.teamId = null
    const result = validateSave(save)
    expect(result.ok).toBe(true)
  })

  it('rejects player with empty string teamId', () => {
    const save = makeValidSave()
    const player = save.league.players['player-1']
    if (player) player.teamId = ''
    const result = validateSave(save)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('non-existent team')
  })

  it('rejects non-array news', () => {
    const raw = asRaw(makeValidSave())
    const league = raw.league as Record<string, unknown> | undefined
    if (league) league.news = 'not an array'
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('news')
  })

  it('rejects missing user', () => {
    const raw = asRaw(makeValidSave())
    delete raw.user
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('user')
  })

  it('rejects user missing managerName', () => {
    const raw = asRaw(makeValidSave())
    const user = raw.user as Record<string, unknown> | undefined
    if (user) delete user.managerName
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('managerName')
  })

  it('rejects user missing teamId', () => {
    const raw = asRaw(makeValidSave())
    const user = raw.user as Record<string, unknown> | undefined
    if (user) delete user.teamId
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('teamId')
  })

  it('rejects mismatched user/teamId and metadata.teamId', () => {
    const raw = asRaw(makeValidSave())
    const user = raw.user as Record<string, unknown>
    user.teamId = 'wrong-team'
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('does not match')
  })

  it('rejects mismatched user/teamId and league.userTeamId', () => {
    const raw = asRaw(makeValidSave())
    const league = raw.league as Record<string, unknown>
    league.userTeamId = 'team-1'
    const user = raw.user as Record<string, unknown>
    user.teamId = 'team-1'
    // Add a second valid team so userTeamId check passes
    const teams = league.teams as Record<string, unknown>
    teams['team-2'] = { id: 'team-2', roster: [] }
    league.userTeamId = 'team-2'
    // user.teamId is 'team-1', meta.teamId is 'team-1', but league.userTeamId is 'team-2'
    const result = validateSave(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('does not match')
  })
})

describe('schema version acceptance', () => {
  it('accepts schema version 1', () => {
    const raw = asRaw(makeValidSave())
    ;(raw.metadata as Record<string, unknown>).schemaVersion = 1
    expect(validateSave(raw).ok).toBe(true)
  })

  it('accepts schema version 2', () => {
    const raw = asRaw(makeValidSave())
    ;(raw.metadata as Record<string, unknown>).schemaVersion = 2
    expect(validateSave(raw).ok).toBe(true)
  })

  it('accepts schema version 3', () => {
    const raw = asRaw(makeValidSave())
    ;(raw.metadata as Record<string, unknown>).schemaVersion = 3
    expect(validateSave(raw).ok).toBe(true)
  })

  it('accepts schema version 4', () => {
    const raw = asRaw(makeValidSave())
    ;(raw.metadata as Record<string, unknown>).schemaVersion = 4
    expect(validateSave(raw).ok).toBe(true)
  })
})
