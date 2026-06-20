import { describe, it, expect } from 'vitest'
import { buildSave } from '@/game/core/saveBuilder'
import type { StaticSnapshot } from '@/game/models'
import { emptyContract, getLeagueRules } from '@/game/models'

function makeFakeSnapshot(): StaticSnapshot {
  return {
    id: 'test-snapshot',
    name: 'Test Season',
    type: 'nba',
    seasonLabel: '2025-26',
    startYear: 2025,
    teams: [
      {
        id: 'team-1',
        city: 'Los Angeles',
        name: 'Lakers',
        abbreviation: 'LAL',
        conference: 'West',
        division: 'Pacific',
        colors: { primary: '#552583', secondary: '#FDB927' },
        marketSize: 95,
        prestige: 85,
        fanPatience: 70,
      },
      {
        id: 'team-2',
        city: 'Boston',
        name: 'Celtics',
        abbreviation: 'BOS',
        conference: 'East',
        division: 'Atlantic',
        colors: { primary: '#007A33', secondary: '#BA9653' },
        marketSize: 80,
        prestige: 90,
        fanPatience: 80,
      },
    ],
    players: [
      {
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
        contract: emptyContract(50_000_000, 1),
      },
      {
        id: 'player-2',
        firstName: 'Jayson',
        lastName: 'Tatum',
        age: 27,
        position: 'SF',
        secondaryPositions: [],
        heightInches: 80,
        weightLbs: 210,
        teamId: 'team-2',
        ratings: {
          insideScoring: 80,
          closeShot: 76,
          midrange: 74,
          threePoint: 78,
          freeThrow: 80,
          ballHandling: 78,
          passing: 72,
          offensiveIq: 80,
          offensiveRebound: 40,
          defensiveRebound: 55,
          perimeterDefense: 65,
          interiorDefense: 50,
          steal: 50,
          block: 35,
          defensiveIq: 70,
          speed: 75,
          strength: 72,
          vertical: 70,
          stamina: 85,
          durability: 80,
          clutch: 75,
          consistency: 80,
          potential: 70,
        },
        tendencies: {
          usageRate: 30,
          passRate: 15,
          shotRate: 28,
          driveRate: 12,
          postUpRate: 8,
          rimFrequency: 25,
          shortMidFrequency: 8,
          longMidFrequency: 7,
          cornerThreeFrequency: 6,
          aboveBreakThreeFrequency: 34,
          threePointRate: 40,
          freeThrowRate: 25,
          turnoverRate: 10,
          isolationRate: 12,
          pickAndRollBallHandlerRate: 18,
          pickAndRollRollManRate: 3,
          spotUpRate: 18,
          transitionRate: 12,
          cutRate: 5,
          foulRate: 2,
          stealAttemptRate: 4,
          blockAttemptRate: 2,
          crashOffensiveGlassRate: 6,
        },
        traits: {
          workEthic: 80,
          loyalty: 75,
          ego: 55,
          greed: 45,
          leadership: 75,
          coachability: 80,
          injuryRisk: 25,
          shotCreation: 80,
          defensiveVersatility: 65,
        },
        contract: emptyContract(54_000_000, 4),
      },
    ],
    seasonStats: [],
    careerStats: [],
    eraConfig: {
      season: '2025-26',
      pace: 100,
      league3PARate: 0.39,
      leagueTsPct: 0.58,
      leaguePpg: 114.7,
      possessionCoefficient: 1.0,
    },
    rules: getLeagueRules('2025-26'),
    awards: [],
    champions: [],
  }
}

const defaultSettings = {
  difficulty: 'pro' as const,
  simSpeed: 'balanced' as const,
  autoSave: true,
  injuries: true,
  fatigue: true,
  salaryCap: true,
  startSeason: '2025-26',
  snapshotId: 'test-snapshot',
}

describe('buildSave', () => {
  it('produces a valid GameSave from a snapshot', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test Dynasty',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save.metadata.id).toBeTruthy()
    expect(save.metadata.schemaVersion).toBe(1)
    expect(save.metadata.name).toBe('Test Dynasty')
    expect(save.metadata.teamId).toBe('team-1')
    expect(save.metadata.snapshotId).toBe('test-snapshot')

    expect(save.league.id).toBeTruthy()
    expect(save.league.name).toBe('Test Dynasty')
    expect(save.league.userTeamId).toBe('team-1')
    expect(save.league.phase).toBe('regular_season')
    expect(save.league.snapshotId).toBe('test-snapshot')
  })

  it('creates teams from snapshot', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    const teamIds = Object.keys(save.league.teams)
    expect(teamIds).toHaveLength(2)
    expect(teamIds).toContain('team-1')
    expect(teamIds).toContain('team-2')
  })

  it('creates players from snapshot', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    const playerIds = Object.keys(save.league.players)
    expect(playerIds).toHaveLength(2)
    expect(playerIds).toContain('player-1')
    expect(playerIds).toContain('player-2')
  })

  it('assigns players to correct team rosters', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save.league.teams['team-1']?.roster).toContain('player-1')
    expect(save.league.teams['team-2']?.roster).toContain('player-2')
  })

  it('sets starters from roster', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save.league.teams['team-1']?.lineup.starters).toHaveLength(1)
    expect(save.league.teams['team-1']?.lineup.starters).toContain('player-1')
  })

  it('zero-initializes standings for all teams', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    const standings = Object.values(save.league.standings)
    expect(standings).toHaveLength(2)
    for (const s of standings) {
      expect(s.wins).toBe(0)
      expect(s.losses).toBe(0)
      expect(s.gamesPlayed).toBe(0)
    }
  })

  it('creates a welcome news event', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test Dynasty',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save.league.news).toHaveLength(1)
    expect(save.league.news[0]?.headline).toContain('Test Dynasty')
    expect(save.league.news[0]?.importance).toBe('high')
  })

  it('generates unique save and league IDs', () => {
    const snapshot = makeFakeSnapshot()
    const save1 = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Dynasty 1',
      managerName: 'Coach',
      settings: defaultSettings,
    })
    const save2 = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Dynasty 2',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save1.metadata.id).not.toBe(save2.metadata.id)
    expect(save1.league.id).not.toBe(save2.league.id)
  })

  it('sets seed in rngState', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save.rngState.seed).toBeTruthy()
    expect(typeof save.rngState.seed).toBe('string')
    expect(save.rngState.position).toBe(0)
  })

  it('preserves era config from snapshot', () => {
    const snapshot = makeFakeSnapshot()
    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save.league.eraConfig.pace).toBe(100)
    expect(save.league.eraConfig.leagueTsPct).toBe(0.58)
  })

  it('preserves snapshot awards and champions', () => {
    const snapshot = makeFakeSnapshot()
    snapshot.awards = [
      {
        season: '2024-25',
        award: 'mvp',
        playerId: 'someone',
        teamId: 'team-1',
      },
    ]
    snapshot.champions = [
      {
        season: '2024-25',
        championTeamId: 'team-2',
        runnerUpTeamId: 'team-1',
        finalsMvpPlayerId: 'player-2',
        seriesResult: '4-1',
      },
    ]

    const save = buildSave({
      snapshot,
      teamId: 'team-1',
      leagueName: 'Test',
      managerName: 'Coach',
      settings: defaultSettings,
    })

    expect(save.league.awards).toHaveLength(1)
    expect(save.league.champions).toHaveLength(1)
  })
})
