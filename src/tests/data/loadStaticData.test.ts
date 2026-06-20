import { describe, it, expect } from 'vitest'
import { createStaticDataLoader } from '@/data/loadStaticData'
import type {
  AwardWinner,
  Champion,
  DataManifest,
  PlayerSeasonStats,
  StaticPlayer,
  StaticTeam,
} from '@/game/models'
import { emptyContract } from '@/game/models'

interface FetchResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}
type FetchLike = (input: string) => Promise<FetchResponse>

function fakeFetcher(files: Record<string, unknown>): FetchLike {
  return (input: string) => {
    if (!(input in files)) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve(null),
      })
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(files[input]),
    })
  }
}

describe('static data loader', () => {
  const manifest: DataManifest = {
    version: '0.2.0',
    defaultSnapshotId: 'nba-2025-26',
    snapshots: [
      {
        id: 'nba-2025-26',
        name: 'NBA 2025-26',
        type: 'nba',
        seasonLabel: '2025-26',
        startYear: 2025,
        basePath: '/data/nba/2025-26',
        teamCount: 1,
        playerCount: 1,
      },
    ],
  }

  const teams: StaticTeam[] = [
    {
      id: 'team-lal',
      externalId: '1610612747',
      city: 'Los Angeles',
      name: 'Lakers',
      abbreviation: 'LAL',
      conference: 'West',
      division: 'Pacific',
      colors: { primary: '#552583', secondary: '#FDB927' },
      marketSize: 10,
      prestige: 95,
      fanPatience: 60,
    },
  ]

  const players: StaticPlayer[] = [
    {
      id: 'p-1',
      externalId: '1',
      firstName: 'LeBron',
      lastName: 'James',
      age: 40,
      position: 'SF',
      secondaryPositions: ['PF'],
      heightInches: 81,
      weightLbs: 250,
      teamId: 'team-lal',
      ratings: {
        insideScoring: 90,
        closeShot: 88,
        midrange: 78,
        threePoint: 78,
        freeThrow: 76,
        ballHandling: 92,
        passing: 95,
        offensiveIq: 96,
        offensiveRebound: 60,
        defensiveRebound: 75,
        perimeterDefense: 80,
        interiorDefense: 70,
        steal: 70,
        block: 60,
        defensiveIq: 86,
        speed: 80,
        strength: 88,
        vertical: 78,
        stamina: 86,
        durability: 90,
        clutch: 92,
        consistency: 95,
        potential: 80,
      },
      tendencies: {
        usageRate: 30,
        passRate: 40,
        shotRate: 30,
        driveRate: 35,
        postUpRate: 10,
        rimFrequency: 25,
        shortMidFrequency: 15,
        longMidFrequency: 10,
        cornerThreeFrequency: 8,
        aboveBreakThreeFrequency: 22,
        threePointRate: 30,
        freeThrowRate: 35,
        turnoverRate: 14,
        isolationRate: 20,
        pickAndRollBallHandlerRate: 35,
        pickAndRollRollManRate: 0,
        spotUpRate: 15,
        transitionRate: 20,
        cutRate: 10,
        foulRate: 2,
        stealAttemptRate: 5,
        blockAttemptRate: 3,
        crashOffensiveGlassRate: 8,
      },
      traits: {
        workEthic: 90,
        loyalty: 70,
        ego: 80,
        greed: 60,
        leadership: 95,
        coachability: 75,
        injuryRisk: 30,
        shotCreation: 95,
        defensiveVersatility: 80,
      },
      contract: emptyContract(50_000_000, 1),
      importMeta: {
        snapshotSeason: '2025-26',
        statsSource: 'test',
        lastUpdated: '2025-09-01',
      },
    },
  ]

  const seasonStats: PlayerSeasonStats[] = [
    {
      playerId: 'p-1',
      season: '2024-25',
      teamId: 'team-lal',
      gamesPlayed: 70,
      minutes: 2520,
      starts: 70,
      points: 1680,
      rebounds: 490,
      offensiveRebounds: 56,
      defensiveRebounds: 434,
      assists: 630,
      steals: 91,
      blocks: 49,
      turnovers: 224,
      fouls: 126,
      fgm: 644,
      fga: 1260,
      tpm: 154,
      tpa: 420,
      ftm: 238,
      fta: 322,
      tsPct: 0.612,
      efgPct: 0.573,
      per: 24.1,
      usageRate: 30.5,
      winShares: 9.2,
      boxPlusMinus: 7.8,
      vorp: 5.2,
    },
    {
      playerId: 'p-1',
      season: '2025-26',
      teamId: 'team-lal',
      gamesPlayed: 0,
      minutes: 0,
      starts: 0,
      points: 0,
      rebounds: 0,
      offensiveRebounds: 0,
      defensiveRebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
      tsPct: 0,
      efgPct: 0,
      per: 0,
      usageRate: 0,
      winShares: 0,
      boxPlusMinus: 0,
      vorp: 0,
    },
  ]

  const awards: AwardWinner[] = []
  const champions: Champion[] = []

  it('loads manifest', async () => {
    const loader = createStaticDataLoader({
      fetcher: fakeFetcher({ '/data/manifest.json': manifest }),
    })
    const result = await loader.loadManifest()
    expect(result.defaultSnapshotId).toBe('nba-2025-26')
    expect(result.snapshots).toHaveLength(1)
  })

  it('loads a snapshot with teams, players, season stats, awards, champions', async () => {
    const loader = createStaticDataLoader({
      fetcher: fakeFetcher({
        '/data/manifest.json': manifest,
        '/data/nba/2025-26/teams.json': teams,
        '/data/nba/2025-26/roster.json': players,
        '/data/nba/2025-26/season-stats.json': seasonStats,
        '/data/shared/awards-history.json': awards,
        '/data/shared/champions.json': champions,
      }),
    })
    const snap = await loader.loadSnapshot('nba-2025-26')
    expect(snap.id).toBe('nba-2025-26')
    expect(snap.teams).toHaveLength(1)
    expect(snap.players).toHaveLength(1)
    expect(snap.seasonStats).toHaveLength(2)
    expect(snap.careerStats).toHaveLength(1)
    expect(snap.careerStats[0]?.totals.points).toBe(1680)
    expect(snap.eraConfig.season).toBe('2025-26')
    expect(snap.rules.regularSeasonGames).toBe(82)
  })

  it('throws on unknown snapshot', async () => {
    const loader = createStaticDataLoader({
      fetcher: fakeFetcher({ '/data/manifest.json': manifest }),
    })
    await expect(loader.loadSnapshot('does-not-exist')).rejects.toThrow(
      /Snapshot not found/,
    )
  })

  it('handles missing awards/champions files gracefully', async () => {
    const loader = createStaticDataLoader({
      fetcher: fakeFetcher({
        '/data/manifest.json': manifest,
        '/data/nba/2025-26/teams.json': teams,
        '/data/nba/2025-26/roster.json': players,
        '/data/nba/2025-26/season-stats.json': seasonStats,
      }),
    })
    const snap = await loader.loadSnapshot('nba-2025-26')
    expect(snap.awards).toEqual([])
    expect(snap.champions).toEqual([])
  })

  it('unwraps awards and champions from wrapped JSON format', async () => {
    const loader = createStaticDataLoader({
      fetcher: fakeFetcher({
        '/data/manifest.json': manifest,
        '/data/nba/2025-26/teams.json': teams,
        '/data/nba/2025-26/roster.json': players,
        '/data/nba/2025-26/season-stats.json': seasonStats,
        '/data/shared/awards-history.json': {
          version: '0.2.0',
          updatedAt: '2025-01-01',
          awards: [
            {
              season: '2025-26',
              award: 'mvp',
              playerId: 'p1',
              teamId: 't1',
            },
          ],
        },
        '/data/shared/champions.json': {
          version: '0.2.0',
          updatedAt: '2025-01-01',
          champions: [
            {
              season: '2025-26',
              championTeamId: 't1',
              runnerUpTeamId: 't2',
              finalsMvpPlayerId: 'p1',
              seriesResult: '4-2',
            },
          ],
        },
      }),
    })
    const snap = await loader.loadSnapshot('nba-2025-26')
    expect(snap.awards).toHaveLength(1)
    expect(snap.awards[0]?.award).toBe('mvp')
    expect(snap.champions).toHaveLength(1)
    expect(snap.champions[0]?.championTeamId).toBe('t1')
  })
})
