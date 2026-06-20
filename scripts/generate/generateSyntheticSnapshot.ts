import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  AwardWinner,
  Champion,
  DataManifest,
  EraConfig,
  PlayerSeasonStats,
  StaticPlayer,
  StaticTeam,
} from '../../src/game/models/index.js'
import { computeCareerStats } from '../../src/game/models/playerCareerStats.js'
import { HISTORICAL_ERA_CONFIGS } from '../../src/game/models/eraConfig.js'
import { getLeagueRules } from '../../src/game/models/leagueRules.js'
import { deriveContract } from '../deriveContracts.js'
import { deriveOwner } from '../deriveOwners.js'
import { CHAMPIONS_HISTORY } from './championsHistory.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DATA = resolve(__dirname, '../../public/data')

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function generateTeams(season: string): StaticTeam[] {
  const teams: StaticTeam[] = [
    {
      id: 'team-bos',
      city: 'Boston',
      name: 'Celtics',
      abbreviation: 'BOS',
      conference: 'East',
      division: 'Atlantic',
      colors: { primary: '#007a33', secondary: '#ba9653' },
      marketSize: 7,
      prestige: 90,
      fanPatience: 75,
    },
    {
      id: 'team-lal',
      city: 'Los Angeles',
      name: 'Lakers',
      abbreviation: 'LAL',
      conference: 'West',
      division: 'Pacific',
      colors: { primary: '#552583', secondary: '#fdb927' },
      marketSize: 10,
      prestige: 95,
      fanPatience: 60,
    },
    {
      id: 'team-gsw',
      city: 'Golden State',
      name: 'Warriors',
      abbreviation: 'GSW',
      conference: 'West',
      division: 'Pacific',
      colors: { primary: '#1d428a', secondary: '#ffc72c' },
      marketSize: 8,
      prestige: 88,
      fanPatience: 70,
    },
    {
      id: 'team-mil',
      city: 'Milwaukee',
      name: 'Bucks',
      abbreviation: 'MIL',
      conference: 'East',
      division: 'Central',
      colors: { primary: '#00471b', secondary: '#eee1c6' },
      marketSize: 5,
      prestige: 75,
      fanPatience: 70,
    },
    {
      id: 'team-den',
      city: 'Denver',
      name: 'Nuggets',
      abbreviation: 'DEN',
      conference: 'West',
      division: 'Northwest',
      colors: { primary: '#0e2240', secondary: '#fec524' },
      marketSize: 6,
      prestige: 80,
      fanPatience: 75,
    },
    {
      id: 'team-okc',
      city: 'Oklahoma City',
      name: 'Thunder',
      abbreviation: 'OKC',
      conference: 'West',
      division: 'Northwest',
      colors: { primary: '#007ac1', secondary: '#ef3b24' },
      marketSize: 5,
      prestige: 82,
      fanPatience: 80,
    },
    {
      id: 'team-mia',
      city: 'Miami',
      name: 'Heat',
      abbreviation: 'MIA',
      conference: 'East',
      division: 'Southeast',
      colors: { primary: '#98002e', secondary: '#f9a01b' },
      marketSize: 7,
      prestige: 85,
      fanPatience: 65,
    },
    {
      id: 'team-phi',
      city: 'Philadelphia',
      name: '76ers',
      abbreviation: 'PHI',
      conference: 'East',
      division: 'Atlantic',
      colors: { primary: '#006bb6', secondary: '#ed174c' },
      marketSize: 7,
      prestige: 78,
      fanPatience: 60,
    },
  ]
  return teams.map((t, i) => ({
    ...t,
    owner: deriveOwner(t, i),
    importMeta: {
      snapshotSeason: season,
      statsSource: 'synthetic',
      lastUpdated: new Date().toISOString(),
    },
  }))
}

function generatePlayers(teams: StaticTeam[], season: string): StaticPlayer[] {
  const positions: {
    pos: 'PG' | 'SG' | 'SF' | 'PF' | 'C'
    height: number
    weight: number
    age: number
  }[] = [
    { pos: 'PG', height: 75, weight: 190, age: 27 },
    { pos: 'SG', height: 77, weight: 205, age: 26 },
    { pos: 'SF', height: 79, weight: 220, age: 28 },
    { pos: 'PF', height: 81, weight: 240, age: 28 },
    { pos: 'C', height: 83, weight: 260, age: 29 },
  ]

  const firstNames = [
    'Luka',
    'Jayson',
    'Joel',
    'Giannis',
    'Nikola',
    'Shai',
    'Anthony',
    'Kawhi',
    'Devin',
    'Trae',
    'Donovan',
    'Tyrese',
    'Jaylen',
    'Paolo',
    'Cade',
    'Scottie',
    'Alperen',
    'Chet',
    'Franz',
    'Jalen',
  ]
  const lastNames = [
    'Doncic',
    'Tatum',
    'Embiid',
    'Antetokounmpo',
    'Jokic',
    'Gilgeous-Alexander',
    'Edwards',
    'Leonard',
    'Booker',
    'Young',
    'Mitchell',
    'Haliburton',
    'Brown',
    'Banchero',
    'Cunningham',
    'Barnes',
    'Sengun',
    'Holmgren',
    'Wagner',
    'Brunson',
  ]

  const players: StaticPlayer[] = []
  let idx = 0
  for (const team of teams) {
    for (let i = 0; i < 5; i++) {
      const profile = positions[i]
      if (!profile) continue
      const fn = firstNames[(idx + i) % firstNames.length] ?? 'Player'
      const ln =
        lastNames[(idx + i) % lastNames.length] ??
        `${team.abbreviation}${i + 1}`
      const rating = clamp(95 - idx * 0.4 - i * 0.8 + randInt(-2, 2), 60, 99)
      const isStar = idx < 4
      players.push({
        id: `p-${team.abbreviation.toLowerCase()}-${i + 1}`,
        externalId: String(10000 + idx * 10 + i),
        firstName: fn,
        lastName: ln,
        age: clamp(profile.age + randInt(-3, 3), 20, 38),
        position: profile.pos,
        secondaryPositions: i === 0 ? ['SG'] : i === 4 ? ['PF'] : [],
        heightInches: profile.height + randInt(-1, 1),
        weightLbs: profile.weight + randInt(-5, 5),
        teamId: team.id,
        ratings: {
          insideScoring: clamp(rating + randInt(-5, 5), 50, 99),
          closeShot: clamp(rating + randInt(-5, 5), 50, 99),
          midrange: clamp(rating + randInt(-8, 5), 50, 99),
          threePoint: clamp(rating + randInt(-10, 5), 50, 99),
          freeThrow: clamp(rating + randInt(-8, 5), 50, 99),
          ballHandling: clamp(rating + randInt(-8, 5), 50, 99),
          passing: clamp(rating + randInt(-5, 5), 50, 99),
          offensiveIq: clamp(rating + randInt(-3, 3), 50, 99),
          offensiveRebound: clamp(rating - 10 + randInt(-8, 8), 40, 99),
          defensiveRebound: clamp(rating - 5 + randInt(-8, 8), 40, 99),
          perimeterDefense: clamp(rating + randInt(-10, 5), 45, 99),
          interiorDefense: clamp(rating + randInt(-10, 5), 45, 99),
          steal: clamp(rating + randInt(-8, 8), 45, 99),
          block: clamp(rating - 5 + randInt(-8, 8), 40, 99),
          defensiveIq: clamp(rating + randInt(-5, 5), 50, 99),
          speed: clamp(rating + randInt(-8, 5), 50, 99),
          strength: clamp(rating + randInt(-5, 5), 50, 99),
          vertical: clamp(rating + randInt(-8, 8), 50, 99),
          stamina: clamp(rating + randInt(-3, 3), 50, 99),
          durability: clamp(rating + randInt(-5, 5), 50, 99),
          clutch: clamp(rating + randInt(-3, 3), 50, 99),
          consistency: clamp(rating + randInt(-3, 3), 50, 99),
          potential: clamp(rating + (isStar ? 5 : 0) + randInt(-3, 3), 50, 99),
        },
        tendencies: {
          usageRate: clamp(20 + (isStar ? 8 : 0) + randInt(-3, 3), 10, 40),
          passRate: clamp(
            15 + (profile.pos === 'PG' ? 10 : 0) + randInt(-3, 3),
            5,
            35,
          ),
          shotRate: clamp(25 + (isStar ? 5 : 0) + randInt(-3, 3), 10, 50),
          driveRate: clamp(
            10 + (profile.pos === 'PG' ? 8 : 0) + randInt(-3, 3),
            5,
            35,
          ),
          postUpRate: clamp(
            5 +
              (profile.pos === 'C' || profile.pos === 'PF' ? 8 : 0) +
              randInt(-2, 2),
            0,
            30,
          ),
          rimFrequency: clamp(25 + randInt(-5, 5), 10, 50),
          shortMidFrequency: clamp(15 + randInt(-3, 3), 5, 30),
          longMidFrequency: clamp(10 + randInt(-3, 3), 0, 20),
          cornerThreeFrequency: clamp(5 + randInt(-2, 2), 0, 15),
          aboveBreakThreeFrequency: clamp(15 + randInt(-3, 3), 5, 30),
          threePointRate: clamp(30 + randInt(-5, 10), 15, 60),
          freeThrowRate: clamp(25 + randInt(-3, 3), 10, 50),
          turnoverRate: clamp(12 + randInt(-2, 4), 5, 25),
          isolationRate: clamp(10 + (isStar ? 8 : 0) + randInt(-3, 3), 0, 35),
          pickAndRollBallHandlerRate: clamp(
            20 + (profile.pos === 'PG' ? 15 : 0) + randInt(-3, 3),
            5,
            50,
          ),
          pickAndRollRollManRate: clamp(
            10 + (profile.pos === 'C' ? 15 : 0) + randInt(-3, 3),
            0,
            30,
          ),
          spotUpRate: clamp(20 + randInt(-3, 3), 5, 40),
          transitionRate: clamp(15 + randInt(-3, 3), 5, 30),
          cutRate: clamp(10 + randInt(-2, 2), 0, 25),
          foulRate: clamp(2 + randInt(-1, 1), 0, 6),
          stealAttemptRate: clamp(5 + randInt(-2, 2), 0, 12),
          blockAttemptRate: clamp(5 + randInt(-2, 2), 0, 12),
          crashOffensiveGlassRate: clamp(10 + randInt(-3, 3), 0, 25),
        },
        traits: {
          workEthic: clamp(50 + randInt(-10, 10), 30, 99),
          loyalty: clamp(50 + randInt(-10, 10), 20, 99),
          ego: clamp(50 + randInt(-10, 10), 20, 99),
          greed: clamp(50 + randInt(-10, 10), 20, 99),
          leadership: clamp(50 + randInt(-10, 10), 20, 99),
          coachability: clamp(50 + randInt(-10, 10), 20, 99),
          injuryRisk: clamp(50 + randInt(-10, 10), 10, 99),
          shotCreation: clamp(rating + randInt(-5, 5), 50, 99),
          defensiveVersatility: clamp(rating + randInt(-5, 5), 50, 99),
        },
        contract: {
          salaryByYear: [0],
          yearsRemaining: 1,
          option: 'none',
          optionYear: null,
          noTradeClause: false,
          signingBonusByYear: [0],
          likelyBonusesByYear: [0],
          unlikelyBonusesByYear: [0],
          guaranteed: false,
          guaranteedByYear: [false],
          tradeKickers: [],
          poisonPill: false,
          birdRights: false,
          earlyBird: false,
          baseYearCompensation: false,
          deferredMoney: [],
        },
        importMeta: {
          snapshotSeason: season,
          statsSource: 'synthetic',
          lastUpdated: new Date().toISOString(),
        },
      })
      idx++
    }
  }

  const rules = getLeagueRules(season)
  for (const player of players) {
    player.contract = deriveContract(player, rules, season)
  }

  return players
}

function generateSeasonStats(
  players: StaticPlayer[],
  season: string,
): PlayerSeasonStats[] {
  return players.map((p) => {
    const gp = randInt(55, 78)
    const mpg = clamp(28 + (p.ratings.consistency - 70) * 0.4, 18, 38)
    const minutes = Math.round(mpg * gp)
    const usage = p.tendencies.usageRate / 100
    const ppg = clamp(
      8 + usage * 28 + (p.ratings.offensiveIq - 70) * 0.2,
      4,
      33,
    )
    const points = Math.round(ppg * gp)
    const rpg = clamp(
      2 +
        p.ratings.defensiveRebound * 0.05 +
        (p.position === 'C' ? 3 : 0) +
        (p.position === 'PF' ? 1.5 : 0),
      1,
      14,
    )
    const apg = clamp(1 + p.tendencies.passRate * 0.18, 0.5, 11)
    const spg = clamp(0.4 + p.ratings.steal * 0.015, 0.2, 2.5)
    const bpg = clamp(0.2 + p.ratings.block * 0.015, 0, 3)
    const topg = clamp(0.8 + p.tendencies.turnoverRate * 0.05, 0.4, 4.5)
    const fga = Math.round(
      (ppg /
        clamp(
          0.45 +
            p.ratings.threePoint * 0.0008 +
            p.ratings.insideScoring * 0.0008,
          0.3,
          0.65,
        )) *
        gp,
    )
    const fgm = Math.round(
      fga * clamp(0.42 + (p.ratings.insideScoring - 70) * 0.005, 0.32, 0.62),
    )
    const tpa = Math.round(
      fga * clamp(0.25 + p.ratings.threePoint * 0.0035, 0.1, 0.6),
    )
    const tpm = Math.round(
      tpa * clamp(0.28 + (p.ratings.threePoint - 60) * 0.008, 0.18, 0.48),
    )
    const fta = Math.round(
      fga * clamp(0.18 + p.ratings.insideScoring * 0.0025, 0.1, 0.55),
    )
    const ftm = Math.round(
      fta * clamp(0.65 + p.ratings.freeThrow * 0.0035, 0.45, 0.93),
    )
    const tsPct = points / (2 * (fga + 0.44 * fta))
    // Ensure tsPct is reasonable (between 0.4 and 0.7)
    const clampedTsPct = clamp(tsPct, 0.4, 0.7)
    const efgPct = clamp((fgm + 0.5 * tpm) / fga, 0.35, 0.65)
    return {
      playerId: p.id,
      season,
      teamId: p.teamId,
      gamesPlayed: gp,
      minutes,
      starts: Math.round(gp * 0.85),
      points,
      rebounds: Math.round(rpg * gp),
      offensiveRebounds: Math.round(rpg * gp * 0.25),
      defensiveRebounds: Math.round(rpg * gp * 0.75),
      assists: Math.round(apg * gp),
      steals: Math.round(spg * gp),
      blocks: Math.round(bpg * gp),
      turnovers: Math.round(topg * gp),
      fouls: Math.round(2 * gp),
      fgm,
      fga,
      tpm,
      tpa,
      ftm,
      fta,
      tsPct: Math.round(clampedTsPct * 1000) / 1000,
      efgPct: Math.round(efgPct * 1000) / 1000,
      per: clamp(8 + p.ratings.offensiveIq * 0.18, 5, 32),
      usageRate: p.tendencies.usageRate,
      winShares: clamp(gp * 0.07 + p.ratings.offensiveIq * 0.04, -1, 16),
      boxPlusMinus: clamp(
        p.ratings.offensiveIq * 0.06 + p.ratings.defensiveIq * 0.04 - 8,
        -6,
        12,
      ),
      vorp: clamp(gp * 0.012 + p.ratings.offensiveIq * 0.02 - 1, -2, 8),
    }
  })
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2), 'utf8')
}

function eraConfigFor(season: string): EraConfig {
  return HISTORICAL_ERA_CONFIGS[season] ?? HISTORICAL_ERA_CONFIGS['2024-25']!
}

export async function generateSeasonSnapshot(season: string): Promise<void> {
  const teams = generateTeams(season)
  const players = generatePlayers(teams, season)
  const seasonStats = generateSeasonStats(players, season)

  const base = `${PUBLIC_DATA}/nba/${season}`
  await writeJson(`${base}/teams.json`, teams)
  await writeJson(`${base}/roster.json`, players)
  await writeJson(`${base}/season-stats.json`, seasonStats)

  const careerStats = computeCareerStats(players[0]?.id ?? 'p', seasonStats)
  await writeJson(`${base}/career-stats.json`, [
    careerStats,
    ...Array.from({ length: Math.max(0, players.length - 1) }, (_, i) => {
      const p = players[i + 1]
      if (!p) return computeCareerStats(`unknown-${i}`, [])
      return computeCareerStats(
        p.id,
        seasonStats.filter((s) => s.playerId === p.id),
      )
    }),
  ])

  await writeJson(`${base}/era-config.json`, eraConfigFor(season))
  console.log(`[synthetic] wrote ${base}/`)
}

export async function generateAllSeasons(): Promise<void> {
  const seasons = Object.keys(HISTORICAL_ERA_CONFIGS).sort()
  for (const s of seasons) {
    await generateSeasonSnapshot(s)
  }
}

export async function generateShared(): Promise<void> {
  const base = `${PUBLIC_DATA}/shared`
  const awards: AwardWinner[] = []
  const champions: Champion[] = CHAMPIONS_HISTORY.map((c) => ({
    season: c.season,
    championTeamId: `team-${c.championAbbrev.toLowerCase()}`,
    runnerUpTeamId: `team-${c.runnerUpAbbrev.toLowerCase()}`,
    finalsMvpPlayerId: 'unknown',
    seriesResult: c.seriesResult,
  }))
  await writeJson(`${base}/awards-history.json`, {
    version: '0.2.0',
    updatedAt: new Date().toISOString(),
    awards,
  })
  await writeJson(`${base}/champions.json`, {
    version: '0.2.0',
    updatedAt: new Date().toISOString(),
    champions,
  })
  await writeJson(`${base}/league-rules.json`, getLeagueRules('2025-26'))
  await writeJson(`${base}/name-pools.json`, { firstNames: [], lastNames: [] })
  await writeJson(`${base}/player-archetypes.json`, { archetypes: [] })
  console.log(`[synthetic] wrote ${base}/`)
}

export async function generateManifest(): Promise<void> {
  const seasons = Object.keys(HISTORICAL_ERA_CONFIGS).sort()
  const manifest: DataManifest = {
    version: '0.2.0',
    defaultSnapshotId: 'nba-2025-26',
    snapshots: seasons.map((s) => ({
      id: `nba-${s}`,
      name: `NBA ${s}`,
      type: 'nba',
      seasonLabel: s,
      startYear: Number(s.split('-')[0] ?? s) || 2025,
      basePath: `/data/nba/${s}`,
      teamCount: 8,
      playerCount: 40,
    })),
  }
  // Fictional league snapshot removed until implemented
  // manifest.snapshots.push({
  //   id: "fictional-base",
  //   name: "Fictional League",
  //   type: "fictional",
  //   seasonLabel: "2025-26",
  //   startYear: 2025,
  //   basePath: "/data/fictional",
  //   teamCount: 30,
  //   playerCount: 450,
  // });
  await writeJson(`${PUBLIC_DATA}/manifest.json`, manifest)
  console.log(
    `[synthetic] wrote ${PUBLIC_DATA}/manifest.json (${manifest.snapshots.length} snapshots)`,
  )
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
) {
  await generateAllSeasons()
  await generateShared()
  await generateManifest()
}
