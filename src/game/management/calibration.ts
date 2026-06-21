import type { StaticSnapshot } from '@/game/models/static'
import type { Team, LineupSettings } from '@/game/models/team'
import type { Player } from '@/game/models/player'
import { simulateGame } from '@/game/sim/gameSimulator'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { DEFAULT_ERA_CONFIG } from '@/game/models/eraConfig'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { emptyTendencies } from '@/game/models/tendencies'
import { emptyTraits } from '@/game/models/traits'
import { emptyContract } from '@/game/models/contract'

export interface CalibrationReport {
  leagueScoring: { avg: number; stdDev: number }
  threePointRate: number
  freeThrowRate: number
  turnoverRate: number
  homeWinRate: number
  starUsageDistribution: { top10: number; top30: number; bench: number }
  blowoutRate: number
  closeGameRate: number
}

export async function runCalibrationSuite(
  snapshot: StaticSnapshot,
): Promise<CalibrationReport> {
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
      era: DEFAULT_ERA_CONFIG,
      rng: gameRng,
      date: '2025-10-20',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })

    const gs = result.gameState
    const hs = gs.teamStats.home
    const as = gs.teamStats.away
    const totalScore = gs.score.home + gs.score.away
    scores.push(totalScore)

    totalThreesMade += hs.tpm + as.tpm
    totalFgMade += hs.fgm + as.fgm
    totalFtMade += hs.ftm + as.ftm
    totalFtAttempted += hs.fta + as.fta
    totalTurnovers += hs.turnovers + as.turnovers
    totalPossessions += Math.max(1, Math.round(hs.fga + hs.turnovers + 0.44 * hs.fta - hs.offensiveRebounds))
    totalPossessions += Math.max(1, Math.round(as.fga + as.turnovers + 0.44 * as.fta - as.offensiveRebounds))

    const margin = Math.abs(gs.score.home - gs.score.away)
    if (gs.homeWin) homeWins++
    if (margin >= 20) blowouts++
    if (margin <= 5) closeGames++
  }

  const games = NUM_GAMES
  const avg = scores.reduce((a, b) => a + b, 0) / games
  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / games

  return {
    leagueScoring: { avg, stdDev: Math.sqrt(variance) },
    threePointRate: totalFgMade > 0 ? totalThreesMade / totalFgMade : 0,
    freeThrowRate: totalFtAttempted > 0 ? totalFtMade / totalFtAttempted : 0,
    turnoverRate: totalPossessions > 0 ? totalTurnovers / totalPossessions : 0,
    homeWinRate: homeWins / games,
    starUsageDistribution: { top10: 0, top30: 0, bench: 0 },
    blowoutRate: blowouts / games,
    closeGameRate: closeGames / games,
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
