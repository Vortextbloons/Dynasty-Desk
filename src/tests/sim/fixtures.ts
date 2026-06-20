import type { Player } from '@/game/models/player'
import type { Team, LineupSettings } from '@/game/models/team'
import type { LeagueRules } from '@/game/models/leagueRules'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { emptyContract } from '@/game/models/contract'
import { emptyTendencies } from '@/game/models/tendencies'
import { emptyTraits } from '@/game/models/traits'

let playerCounter = 0

export function makePlayer(overrides: Partial<Player> = {}): Player {
  playerCounter++
  const id = overrides.id ?? `p-${playerCounter}`
  const position = overrides.position ?? 'SF'
  return {
    id,
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? `Player${playerCounter}`,
    age: overrides.age ?? 25,
    position,
    secondaryPositions: overrides.secondaryPositions ?? [],
    heightInches: overrides.heightInches ?? 78,
    weightLbs: overrides.weightLbs ?? 200,
    teamId: overrides.teamId ?? 'team-home',
    ratings: {
      insideScoring: 70,
      closeShot: 70,
      midrange: 70,
      threePoint: 70,
      freeThrow: 75,
      ballHandling: 70,
      passing: 70,
      offensiveIq: 70,
      offensiveRebound: 50,
      defensiveRebound: 60,
      perimeterDefense: 60,
      interiorDefense: 60,
      steal: 60,
      block: 50,
      defensiveIq: 65,
      speed: 70,
      strength: 70,
      vertical: 65,
      stamina: 75,
      durability: 75,
      clutch: 70,
      consistency: 70,
      potential: 70,
      overall: 70,
      ...(overrides.ratings ?? {}),
    },
    tendencies: {
      ...emptyTendencies(),
      ...(overrides.tendencies ?? {}),
    },
    traits: {
      ...emptyTraits(),
      ...(overrides.traits ?? {}),
    },
    contract: overrides.contract ?? emptyContract(5_000_000, 2),
    morale: overrides.morale ?? {
      level: 75,
      happiness: 75,
      roleSatisfaction: 75,
      teamSatisfaction: 75,
      tradeRequest: false,
      tradeRequestLevel: 0,
    },
    health: overrides.health ?? {
      status: 'healthy',
      injuryDescription: null,
      daysRemaining: 0,
      gamesRemaining: 0,
    },
    development: overrides.development ?? {
      lastTrainedAt: null,
      focusArea: null,
      recentForm: 50,
      ageAtPeak: 27,
      progressionCurve: 'normal',
      ratingsDelta: {},
      breakoutChance: 0.1,
      bustRisk: 0.1,
    },
    seasonStats: overrides.seasonStats ?? {
      season: '2025-26',
      teamId: overrides.teamId ?? 'team-home',
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
    careerStats: overrides.careerStats ?? [],
    historicalSeasons: overrides.historicalSeasons ?? [],
    ...overrides,
  } as Player
}

let teamCounter = 0

export function makeTeam(overrides: Partial<Team> = {}): Team {
  teamCounter++
  const id = overrides.id ?? `team-${teamCounter}`
  return {
    id,
    city: overrides.city ?? 'Test',
    name: overrides.name ?? `City${teamCounter}`,
    abbreviation: overrides.abbreviation ?? `T${teamCounter}`,
    conference: overrides.conference ?? 'East',
    division: overrides.division ?? 'Atlantic',
    colors: overrides.colors ?? { primary: '#000', secondary: '#fff' },
    roster: overrides.roster ?? [],
    lineup: overrides.lineup ?? defaultLineup(),
    strategy: overrides.strategy ?? {
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
    finances: overrides.finances ?? {
      salaryCap: DEFAULT_LEAGUE_RULES.salaryCap,
      apron: DEFAULT_LEAGUE_RULES.apron,
      secondApron: DEFAULT_LEAGUE_RULES.secondApron,
      luxuryTaxLine: DEFAULT_LEAGUE_RULES.luxuryTaxLine,
      payroll: 0,
      capSpace: DEFAULT_LEAGUE_RULES.salaryCap,
      taxBill: 0,
      projectedTaxBill: 0,
      baseRevenue: 0,
      localRevenue: 0,
      seasonPerformanceBonus: 0,
      totalRevenue: 0,
      operatingExpenses: 10_000_000,
      totalExpenses: 10_000_000,
      netIncome: 0,
      ownerCash: 50_000_000,
      cashReserves: 100_000_000,
      ownerPatience: 70,
      exceptionsUsed: {
        mle: false,
        bae: false,
        roomMle: false,
        minimumCount: 0,
      },
    },
    direction: overrides.direction ?? 'middle',
    chemistry: overrides.chemistry ?? 50,
    morale: overrides.morale ?? 50,
    prestige: overrides.prestige ?? 75,
    owner: overrides.owner,
  }
}

export function defaultLineup(): LineupSettings {
  return {
    starters: [],
    bench: [],
    closingLineup: [],
    targetMinutes: {},
    autoRotation: true,
  }
}

export function defaultRules(): LeagueRules {
  return { ...DEFAULT_LEAGUE_RULES }
}

export function makeRoster(teamId: string, count: number, baseOverrides: Partial<Player> = {}): Player[] {
  const players: Player[] = []
  for (let i = 0; i < count; i++) {
    players.push(makePlayer({ teamId, id: `${teamId}-p-${i + 1}`, ...baseOverrides }))
  }
  return players
}

export function resetFixtureCounters(): void {
  playerCounter = 0
  teamCounter = 0
}
