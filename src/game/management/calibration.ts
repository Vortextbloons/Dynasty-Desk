import type { StaticSnapshot, StaticPlayer } from '@/game/models/static'
import type { Team, LineupSettings } from '@/game/models/team'
import type { Player } from '@/game/models/player'
import type { PlayerRatings } from '@/game/models/ratings'
import type { EraConfig } from '@/game/models/eraConfig'
import { simulateGame } from '@/game/sim/gameSimulator'
import { buildBoxScore } from '@/game/sim/boxScoreBuilder'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { DEFAULT_ERA_CONFIG } from '@/game/models/eraConfig'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { emptyTendencies } from '@/game/models/tendencies'
import { emptyTraits } from '@/game/models/traits'
import { emptyContract } from '@/game/models/contract'

// ---------------------------------------------------------------------------
// 2K classic team data types
// ---------------------------------------------------------------------------

export interface TwoKPlayerRating {
  name: string
  position: string
  overall: number
  threePoint: number
  dunk: number
}

export interface TwoKTeamData {
  season: string
  teamName: string
  teamOvr: number
  teamIns: number
  teamOut: number
  teamAth: number
  teamPla: number
  teamDef: number
  teamReb: number
  teamInt: number
  players: TwoKPlayerRating[]
}

// ---------------------------------------------------------------------------
// Rating keys that can be compared to 2K categories
// ---------------------------------------------------------------------------

const OUR_INSIDE_KEYS: (keyof PlayerRatings)[] = ['insideScoring', 'closeShot', 'offensiveRebound', 'defensiveRebound']
const OUR_OUTSIDE_KEYS: (keyof PlayerRatings)[] = ['threePoint', 'midrange', 'freeThrow']
const OUR_ATHLETICISM_KEYS: (keyof PlayerRatings)[] = ['speed', 'strength', 'vertical', 'stamina', 'durability']
const OUR_PLAYMAKING_KEYS: (keyof PlayerRatings)[] = ['ballHandling', 'passing', 'offensiveIq']
const OUR_DEFENSE_KEYS: (keyof PlayerRatings)[] = ['perimeterDefense', 'interiorDefense', 'steal', 'block', 'defensiveIq']

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface TwoKComparison {
  matchedPlayers: number
  overallCorrelation: number
  overallMeanBias: number
  categoryCorrelations: Record<string, number>
  categoryBiases: Record<string, number>
  biggestOverratings: Array<{ name: string; ours: number; twoK: number; delta: number }>
  biggestUnderratings: Array<{ name: string; ours: number; twoK: number; delta: number }>
}

export interface CalibrationReport {
  leagueScoring: { avg: number; stdDev: number }
  threePointRate: number
  freeThrowRate: number
  turnoverRate: number
  homeWinRate: number
  starUsageDistribution: { top10: number; top30: number; bench: number }
  blowoutRate: number
  closeGameRate: number
  twoKComparison?: TwoKComparison
}

// ---------------------------------------------------------------------------
// Calibration suite
// ---------------------------------------------------------------------------

export interface CalibrationOptions {
  eraConfig?: EraConfig
  twoKData?: TwoKTeamData[]
}

export async function runCalibrationSuite(
  snapshot: StaticSnapshot,
  options?: CalibrationOptions,
): Promise<CalibrationReport> {
  const era = options?.eraConfig ?? DEFAULT_ERA_CONFIG
  const rng = new SeededRandom(createRngState('calibration-001'))
  const NUM_GAMES = 1000

  const players = buildCalibrationPlayers(snapshot)
  if (players.teamA.length < 10 || players.teamB.length < 10) {
    throw new Error('Need at least 10 players per team for calibration')
  }

  const teamA = makeTeam('calib-a', 'Alpha', 'East')
  const teamB = makeTeam('calib-b', 'Beta', 'West')
  const lineupA = makeLineup(players.teamA.map((p) => p.id))
  const lineupB = makeLineup(players.teamB.map((p) => p.id))

  const scores: number[] = []
  let totalThreesMade = 0
  let totalFgMade = 0
  let totalFtMade = 0
  let totalFtAttempted = 0
  let totalTurnovers = 0
  let totalPossessions = 0
  let homeWins = 0
  let blowouts = 0
  let closeGames = 0
  const playerFga = new Map<string, number>()
  let totalFgaAll = 0

  for (let i = 0; i < NUM_GAMES; i++) {
    const gameRng = new SeededRandom(rng.state)
    rng.next()
    const result = await simulateGame({
      id: `calib-game-${i}`,
      home: teamA,
      away: teamB,
      homeLineup: lineupA,
      awayLineup: lineupB,
      homePlayers: players.teamA,
      awayPlayers: players.teamB,
      rules: DEFAULT_LEAGUE_RULES,
      era,
      rng: gameRng,
      date: '2025-10-20',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })

    const box = buildBoxScore({
      gameState: result.gameState,
      homePlayers: players.teamA,
      awayPlayers: players.teamB,
      keyPlays: result.keyPlays,
    })
    const hs = box.teamStats.home
    const as = box.teamStats.away
    const totalScore = box.homeScore + box.awayScore
    scores.push(totalScore)

    totalThreesMade += hs.tpm + as.tpm
    totalFgMade += hs.fgm + as.fgm
    totalFtMade += hs.ftm + as.ftm
    totalFtAttempted += hs.fta + as.fta
    totalTurnovers += hs.turnovers + as.turnovers
    totalPossessions += Math.max(1, Math.round(hs.fga + hs.turnovers + 0.44 * hs.fta - hs.offensiveRebounds))
    totalPossessions += Math.max(1, Math.round(as.fga + as.turnovers + 0.44 * as.fta - as.offensiveRebounds))

    const margin = Math.abs(box.homeScore - box.awayScore)
    if (box.homeWin) homeWins++
    if (margin >= 20) blowouts++
    if (margin <= 5) closeGames++

    for (const [playerId, stats] of Object.entries(box.playerStats)) {
      const current = playerFga.get(playerId) ?? 0
      playerFga.set(playerId, current + stats.fga)
      totalFgaAll += stats.fga
    }
  }

  const games = NUM_GAMES
  const avg = scores.reduce((a, b) => a + b, 0) / games
  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / games

  const sortedByOvr = [...snapshot.players].sort((a, b) => {
    const aOvr = a.ratings.overall ?? 50
    const bOvr = b.ratings.overall ?? 50
    return bOvr - aOvr
  })
  const top10Ids = new Set(sortedByOvr.slice(0, 10).map((p) => p.id))
  const top30Ids = new Set(sortedByOvr.slice(0, 30).map((p) => p.id))
  let top10Fga = 0
  let top30Fga = 0
  let benchFga = 0
  for (const [playerId, fga] of playerFga) {
    if (top10Ids.has(playerId)) {
      top10Fga += fga
    }
    if (top30Ids.has(playerId)) {
      top30Fga += fga
    } else {
      benchFga += fga
    }
  }

  const report: CalibrationReport = {
    leagueScoring: { avg, stdDev: Math.sqrt(variance) },
    threePointRate: totalFgMade > 0 ? totalThreesMade / totalFgMade : 0,
    freeThrowRate: totalFtAttempted > 0 ? totalFtMade / totalFtAttempted : 0,
    turnoverRate: totalPossessions > 0 ? totalTurnovers / totalPossessions : 0,
    homeWinRate: homeWins / games,
    starUsageDistribution: {
      top10: totalFgaAll > 0 ? top10Fga / totalFgaAll : 0,
      top30: totalFgaAll > 0 ? top30Fga / totalFgaAll : 0,
      bench: totalFgaAll > 0 ? benchFga / totalFgaAll : 0,
    },
    blowoutRate: blowouts / games,
    closeGameRate: closeGames / games,
  }

  if (options?.twoKData && options.twoKData.length > 0) {
    report.twoKComparison = compareWith2K(snapshot, options.twoKData)
  }

  return report
}

// ---------------------------------------------------------------------------
// 2K comparison
// ---------------------------------------------------------------------------

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/gi, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/))
  const tokensB = new Set(b.split(/\s+/))
  let intersection = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++
  }
  const union = tokensA.size + tokensB.size - intersection
  return union > 0 ? intersection / union : 0
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  return tokenOverlap(na, nb)
}

function matchPlayers(
  ourPlayers: StaticPlayer[],
  twoKTeams: TwoKTeamData[],
): Array<{ ours: StaticPlayer; twoK: TwoKPlayerRating }> {
  const allTwoKPlayers = twoKTeams.flatMap((t) => t.players)
  const matched: Array<{ ours: StaticPlayer; twoK: TwoKPlayerRating }> = []
  const used = new Set<number>()

  for (const our of ourPlayers) {
    const ourName = `${our.firstName} ${our.lastName}`
    let bestIdx = -1
    let bestScore = 0

    for (let i = 0; i < allTwoKPlayers.length; i++) {
      if (used.has(i)) continue
      const score = nameSimilarity(ourName, allTwoKPlayers[i]!.name)
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    if (bestIdx >= 0 && bestScore >= 0.7) {
      matched.push({ ours: our, twoK: allTwoKPlayers[bestIdx]! })
      used.add(bestIdx)
    }
  }

  return matched
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dx2 = 0
  let dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx
    const dy = ys[i]! - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom > 0 ? num / denom : 0
}

function compareWith2K(
  snapshot: StaticSnapshot,
  twoKTeams: TwoKTeamData[],
): TwoKComparison {
  const pairs = matchPlayers(snapshot.players, twoKTeams)

  const ourOvrs = pairs.map((p) => p.ours.ratings.overall ?? 50)
  const twoKOvrs = pairs.map((p) => p.twoK.overall)

  const overallCorrelation = pearson(ourOvrs, twoKOvrs)
  const overallMeanBias =
    pairs.length > 0
      ? pairs.reduce((sum, p) => sum + ((p.ours.ratings.overall ?? 50) - p.twoK.overall), 0) / pairs.length
      : 0

  const categoryDefs: Record<string, (keyof PlayerRatings)[]> = {
    insideScoring: OUR_INSIDE_KEYS,
    outsideScoring: OUR_OUTSIDE_KEYS,
    athleticism: OUR_ATHLETICISM_KEYS,
    playmaking: OUR_PLAYMAKING_KEYS,
    defense: OUR_DEFENSE_KEYS,
  }

  const categoryCorrelations: Record<string, number> = {}
  const categoryBiases: Record<string, number> = {}

  for (const [, keys] of Object.entries(categoryDefs)) {
    // Use 2K team-level category data when available, otherwise skip
    // For player-level we only have OVR, 3PT, DNK — so we compare those directly
    if (keys === OUR_OUTSIDE_KEYS) {
      const twoKThree = pairs.map((p) => p.twoK.threePoint)
      categoryCorrelations.threePoint = pearson(
        pairs.map((p) => p.ours.ratings.threePoint),
        twoKThree,
      )
      categoryBiases.threePoint =
        pairs.length > 0
          ? pairs.reduce((s, p) => s + (p.ours.ratings.threePoint - p.twoK.threePoint), 0) / pairs.length
          : 0
    }
  }

  // Overall bias per player
  const deltas = pairs.map((p) => ({
    name: `${p.ours.firstName} ${p.ours.lastName}`,
    ours: p.ours.ratings.overall ?? 50,
    twoK: p.twoK.overall,
    delta: (p.ours.ratings.overall ?? 50) - p.twoK.overall,
  }))

  const sorted = [...deltas].sort((a, b) => b.delta - a.delta)
  const biggestOverratings = sorted.slice(0, 5).map(({ name, ours, twoK, delta }) => ({ name, ours, twoK, delta }))
  const biggestUnderratings = sorted
    .slice(-5)
    .reverse()
    .map(({ name, ours, twoK, delta }) => ({ name, ours, twoK, delta }))

  return {
    matchedPlayers: pairs.length,
    overallCorrelation,
    overallMeanBias,
    categoryCorrelations,
    categoryBiases,
    biggestOverratings,
    biggestUnderratings,
  }
}

function buildCalibrationPlayers(snapshot: StaticSnapshot): { teamA: Player[]; teamB: Player[] } {
  const sorted = [...snapshot.players].sort((a, b) => {
    const aOvr = a.ratings.overall ?? 50
    const bOvr = b.ratings.overall ?? 50
    return bOvr - aOvr
  })

  const teamA: Player[] = []
  const teamB: Player[] = []

  for (let i = 0; i < Math.min(20, sorted.length); i++) {
    const sp = sorted[i]!
    const player = toFullPlayer(sp, i < 10 ? 'calib-a' : 'calib-b')
    if (i < 10) teamA.push(player)
    else teamB.push(player)
  }

  while (teamA.length < 10) {
    teamA.push(makePlaceholderPlayer(`filler-a-${teamA.length}`, 'calib-a'))
  }
  while (teamB.length < 10) {
    teamB.push(makePlaceholderPlayer(`filler-b-${teamB.length}`, 'calib-b'))
  }

  return { teamA, teamB }
}

function toFullPlayer(sp: import('@/game/models/static').StaticPlayer, teamId: string): Player {
  return {
    id: sp.id,
    firstName: sp.firstName,
    lastName: sp.lastName,
    age: sp.age,
    position: sp.position,
    secondaryPositions: sp.secondaryPositions ?? [],
    heightInches: sp.heightInches,
    weightLbs: sp.weightLbs,
    teamId,
    ratings: sp.ratings,
    tendencies: sp.tendencies,
    traits: sp.traits,
    contract: sp.contract,
    morale: { level: 50, happiness: 50, roleSatisfaction: 50, teamSatisfaction: 50, tradeRequest: false, tradeRequestLevel: 0 },
    health: { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0, injuryHistory: [] },
    development: { lastTrainedAt: null, focusArea: null, trainingFocus: 'balanced', recentForm: 0, ageAtPeak: 27, progressionCurve: 'normal', ratingsDelta: {}, breakoutChance: 0, bustRisk: 0 },
    fatigue: 0,
    seasonStats: emptySeasonStat(sp.id),
    careerStats: [],
    historicalSeasons: [],
  }
}

function emptySeasonStat(_playerId: string): import('@/game/models/player').PlayerSeasonStat {
  return {
    season: '',
    teamId: null,
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
  }
}

function makePlaceholderPlayer(id: string, teamId: string): Player {
  const ovr = 50
  return {
    id,
    firstName: 'Backup',
    lastName: `Player ${id.slice(-1)}`,
    age: 25,
    position: 'SF',
    secondaryPositions: [],
    heightInches: 78,
    weightLbs: 210,
    teamId,
    ratings: {
      insideScoring: ovr, closeShot: ovr, midrange: ovr, threePoint: ovr, freeThrow: ovr,
      ballHandling: ovr, passing: ovr, offensiveIq: ovr,
      offensiveRebound: ovr, defensiveRebound: ovr,
      perimeterDefense: ovr, interiorDefense: ovr, steal: ovr, block: ovr, defensiveIq: ovr,
      speed: ovr, strength: ovr, vertical: ovr, stamina: ovr, durability: ovr,
      clutch: ovr, consistency: ovr, potential: ovr, overall: ovr,
    },
    tendencies: emptyTendencies(),
    traits: emptyTraits(),
    contract: emptyContract(5_000_000, 1),
    morale: { level: 50, happiness: 50, roleSatisfaction: 50, teamSatisfaction: 50, tradeRequest: false, tradeRequestLevel: 0 },
    health: { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0, injuryHistory: [] },
    development: { lastTrainedAt: null, focusArea: null, trainingFocus: 'balanced', recentForm: 0, ageAtPeak: 27, progressionCurve: 'normal', ratingsDelta: {}, breakoutChance: 0, bustRisk: 0 },
    fatigue: 0,
    seasonStats: emptySeasonStat(id),
    careerStats: [],
    historicalSeasons: [],
  }
}

function makeTeam(id: string, name: string, conference: 'East' | 'West'): Team {
  return {
    id,
    city: name,
    name,
    abbreviation: name.slice(0, 3).toUpperCase(),
    conference,
    division: 'Calibration',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    roster: [],
    lineup: { starters: [], bench: [], closingLineup: [], targetMinutes: {}, autoRotation: true },
    strategy: {
      offense: { pace: 'balanced', shotProfile: 'balanced', primaryAction: 'pick_and_roll', usageDistribution: 'balanced', crashOffensiveGlass: 'medium' },
      defense: { pickAndRollCoverage: 'drop', helpDefense: 'balanced', pressure: 'medium', reboundingFocus: 'balanced', physicality: 'balanced' },
    },
    finances: {
      salaryCap: 140_588_000,
      apron: 172_100_000,
      secondApron: 188_900_000,
      luxuryTaxLine: 165_294_000,
      payroll: 0,
      capSpace: 140_588_000,
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
      ownerPatience: 50,
      exceptionsUsed: { mle: false, bae: false, roomMle: false, minimumCount: 0 },
    },
    direction: 'middle',
    chemistry: 50,
    morale: 50,
    prestige: 50,
    trainingFocus: 'balanced',
    loadManagement: [],
    owner: { teamId: id, name: 'Owner', personality: 'hands_off', netWorth: 1_000_000_000, cash: 50_000_000, softCashPressureSeasons: 0 },
    tradeExceptions: [],
    frozenPicks: [],
    priorTaxpayerYears: 0,
    taxpayerHistory: [],
    twoWayPlayers: [],
  }
}

function makeLineup(playerIds: string[]): LineupSettings {
  const starters = playerIds.slice(0, 5)
  const bench = playerIds.slice(5)
  const targetMinutes: Record<string, number> = {}
  const perStarter = 32
  const perBench = (240 - starters.length * perStarter) / Math.max(1, bench.length)
  for (const id of starters) targetMinutes[id] = perStarter
  for (const id of bench) targetMinutes[id] = perBench
  return { starters, bench, closingLineup: starters, targetMinutes, autoRotation: true }
}
