import type { GameSave } from '@/game/models'
import type { TeamFinances } from '@/game/models/team'
import type { DraftPick } from '@/game/models/draft'
import {
  OPERATING_EXPENSES_BASELINE,
  OWNER_CASH_INITIAL,
  CASH_RESERVES_INITIAL,
  OWNER_PATIENCE_INITIAL,
} from '@/game/management/financeConstants'
import { computeOverall } from '@/game/ratings/overallWeights'
import { isPosition } from '@/game/models/position'
import type { PlayerRatings } from '@/game/models/ratings'
import { normalizeModernSimSpeed } from '@/game/core/settingsPersistence'

interface GameSaveV1 {
  metadata: {
    id: string
    name: string
    createdAt: string
    updatedAt: string
    appVersion: string
    schemaVersion: number
    teamId: string
    teamName: string
    currentSeason: number
    currentDate: string
    leagueName: string
    snapshotId: string
  }
  league: {
    id: string
    name: string
    currentDate: string
    seasonYear: number
    phase: string
    rules: Record<string, unknown>
    eraConfig: Record<string, unknown>
    snapshotId: string
    teams: Record<string, Record<string, unknown>>
    players: Record<string, Record<string, unknown>>
    games: Record<string, unknown>
    standings: Record<string, unknown>
    transactions: unknown[]
    news: unknown[]
    awardsHistory: unknown[]
    draftPicks: unknown[]
    draftClasses: Record<string, unknown>
    champions: unknown[]
    awards: unknown[]
    userTeamId: string
  }
  user: { managerName: string; teamId: string }
  settings: Record<string, unknown>
  rngState: Record<string, unknown>
}

function hydrateFinances(
  team: Record<string, unknown>,
  rules: Record<string, unknown>,
  leaguePlayers: Record<string, Record<string, unknown>>,
): TeamFinances {
  const salaryCap = (rules.salaryCap as number) ?? 140_588_000
  const apron = (rules.apron as number) ?? 178_132_000
  const secondApron = (rules.secondApron as number) ?? 189_502_000
  const luxuryTaxLine = (rules.luxuryTaxLine as number) ?? 171_314_000

  const roster = (team.roster as string[]) ?? []

  let payroll = 0
  for (const pid of roster) {
    const player = leaguePlayers[pid]
    if (player?.contract) {
      const c = player.contract as Record<string, unknown>
      const salaryByYear = c.salaryByYear as number[] | undefined
      const salary = salaryByYear?.[0] ?? 0
      const signingBonusByYear = c.signingBonusByYear as
        | number[]
        | undefined
      const signingBonus = signingBonusByYear?.[0] ?? 0
      const likelyBonusesByYear = c.likelyBonusesByYear as
        | number[]
        | undefined
      const likelyBonus = likelyBonusesByYear?.[0] ?? 0
      payroll += salary + signingBonus + likelyBonus
    }
  }

  const existing = team.finances as Record<string, unknown> | undefined

  return {
    salaryCap,
    apron,
    secondApron,
    luxuryTaxLine,
    payroll,
    capSpace: salaryCap - payroll,
    taxBill: 0,
    projectedTaxBill: 0,

    baseRevenue: 0,
    localRevenue: 0,
    seasonPerformanceBonus: 0,
    totalRevenue: 0,

    operatingExpenses:
      (existing?.operatingExpenses as number) ?? OPERATING_EXPENSES_BASELINE,
    totalExpenses:
      (existing?.totalExpenses as number) ?? OPERATING_EXPENSES_BASELINE,
    netIncome: 0,

    ownerCash:
      (existing?.ownerCash as number) ?? OWNER_CASH_INITIAL,
    cashReserves:
      (existing?.cashReserves as number) ?? CASH_RESERVES_INITIAL,
    ownerPatience:
      (existing?.ownerPatience as number) ?? OWNER_PATIENCE_INITIAL,

    exceptionsUsed: {
      mle: false,
      bae: false,
      roomMle: false,
      minimumCount: 0,
    },
  }
}

export function migrateToV2(input: unknown): GameSave {
  const v1 = input as GameSaveV1

  const leaguePlayers = v1.league.players

  const teams: GameSave['league']['teams'] = {}
  for (const [teamId, teamRaw] of Object.entries(v1.league.teams)) {
    const team = teamRaw
    const existing = team.finances as Record<string, unknown> | undefined
    teams[teamId] = {
      ...team,
      finances: hydrateFinances(team, v1.league.rules, leaguePlayers),
      owner: team.owner ?? {
        teamId,
        name: 'Unknown Owner',
        personality: 'hands_off' as const,
        netWorth: 15_000_000_000,
        cash: (existing?.ownerCash as number) ?? 50_000_000,
        softCashPressureSeasons: 0,
      },
    } as GameSave['league']['teams'][string]
  }

  return {
    ...v1,
    metadata: {
      ...v1.metadata,
      schemaVersion: 2,
    },
    league: {
      ...v1.league,
      rules: v1.league.rules as unknown as GameSave['league']['rules'],
      eraConfig: v1.league.eraConfig as unknown as GameSave['league']['eraConfig'],
      teams,
    },
  } as unknown as GameSave
}

export function migrateToV3(input: unknown): GameSave {
  const save = input as GameSave

  const players: GameSave['league']['players'] = {}
  for (const [pid, player] of Object.entries(save.league.players)) {
    const p = player as unknown as Record<string, unknown>
    const ratings = p.ratings as Record<string, unknown>
    const position = isPosition(p.position) ? p.position : 'SF'

    const overall = typeof ratings.overall === 'number'
      ? ratings.overall
      : computeOverall(ratings as unknown as PlayerRatings, position)

    const morale = (p.morale ?? {}) as Record<string, unknown>
    const health = (p.health ?? {}) as Record<string, unknown>
    const development = (p.development ?? {}) as Record<string, unknown>

    const teamId = p.teamId as string | null
    const teamStanding = teamId ? (save.league.standings[teamId] as Record<string, unknown> | undefined) : undefined
    const winPct = (teamStanding?.winPct as number) ?? 0.5
    const happiness = typeof morale.happiness === 'number' ? morale.happiness : Math.round(50 + winPct * 50)

    players[pid] = {
      ...p,
      ratings: { ...ratings, overall },
      morale: {
        level: typeof morale.level === 'number' ? morale.level : happiness,
        happiness,
        roleSatisfaction: typeof morale.roleSatisfaction === 'number' ? morale.roleSatisfaction : 75,
        teamSatisfaction: typeof morale.teamSatisfaction === 'number' ? morale.teamSatisfaction : happiness,
        tradeRequest: typeof morale.tradeRequest === 'boolean' ? morale.tradeRequest : false,
        tradeRequestLevel: typeof morale.tradeRequestLevel === 'number' ? morale.tradeRequestLevel : 0,
      },
      health: {
        status: health.status ?? 'healthy',
        injuryDescription: health.injuryDescription ?? null,
        daysRemaining: typeof health.daysRemaining === 'number' ? health.daysRemaining : 0,
        gamesRemaining: typeof health.gamesRemaining === 'number' ? health.gamesRemaining : 0,
      },
      development: {
        lastTrainedAt: development.lastTrainedAt ?? null,
        focusArea: development.focusArea ?? null,
        recentForm: typeof development.recentForm === 'number' ? development.recentForm : 50,
        ageAtPeak: typeof development.ageAtPeak === 'number' ? development.ageAtPeak : 27,
        progressionCurve: development.progressionCurve ?? 'normal',
        ratingsDelta: development.ratingsDelta ?? {},
        breakoutChance: typeof development.breakoutChance === 'number' ? development.breakoutChance : 0.1,
        bustRisk: typeof development.bustRisk === 'number' ? development.bustRisk : 0.1,
      },
    } as GameSave['league']['players'][string]
  }

  return {
    ...save,
    metadata: {
      ...save.metadata,
      schemaVersion: 3,
    },
    league: {
      ...save.league,
      players,
    },
  }
}

export function migrateToV4(input: unknown): GameSave {
  const save = input as GameSave

  const settings = save.settings as unknown as Record<string, unknown>
  const migratedSpeed = normalizeModernSimSpeed(settings.simSpeed)

  return {
    ...save,
    metadata: {
      ...save.metadata,
      schemaVersion: 4,
    },
    settings: {
      ...save.settings,
      simSpeed: migratedSpeed,
    },
  }
}

export function migrateToV5(input: unknown): GameSave {
  const save = input as GameSave

  const league = save.league as unknown as Record<string, unknown>

  const standingsRaw = league.standings as Record<string, Record<string, unknown>> | undefined
  const standings: GameSave['league']['standings'] = {}
  if (standingsRaw) {
    for (const [tid, s] of Object.entries(standingsRaw)) {
      standings[tid] = {
        ...s,
        conferenceWins: typeof s.conferenceWins === 'number' ? s.conferenceWins : 0,
        conferenceLosses: typeof s.conferenceLosses === 'number' ? s.conferenceLosses : 0,
        divisionWins: typeof s.divisionWins === 'number' ? s.divisionWins : 0,
        divisionLosses: typeof s.divisionLosses === 'number' ? s.divisionLosses : 0,
        pointsPerGame: typeof s.pointsPerGame === 'number' ? s.pointsPerGame : 0,
        pointsAllowedPerGame: typeof s.pointsAllowedPerGame === 'number' ? s.pointsAllowedPerGame : 0,
        pointDifferentialPerGame: typeof s.pointDifferentialPerGame === 'number' ? s.pointDifferentialPerGame : 0,
        gamesRemaining: typeof s.gamesRemaining === 'number' ? s.gamesRemaining : 82,
        magicNumber: typeof s.magicNumber === 'number' ? s.magicNumber : 0,
        tiebreaker: s.tiebreaker ?? { headToHeadWins: 0, conferenceWinPct: 0, pointDifferential: 0 },
      } as GameSave['league']['standings'][string]
    }
  }

  const gamesRaw = league.games as Record<string, Record<string, unknown>> | undefined
  const games: GameSave['league']['games'] = {}
  if (gamesRaw) {
    for (const [gid, g] of Object.entries(gamesRaw)) {
      games[gid] = {
        ...g,
        isConference: typeof g.isConference === 'boolean' ? g.isConference : false,
        isDivision: typeof g.isDivision === 'boolean' ? g.isDivision : false,
        seasonYear: typeof g.seasonYear === 'number' ? g.seasonYear : 0,
        isUserTeamGame: typeof g.isUserTeamGame === 'boolean' ? g.isUserTeamGame : false,
      } as GameSave['league']['games'][string]
    }
  }

  return {
    ...save,
    metadata: {
      ...save.metadata,
      schemaVersion: 5,
    },
    league: {
      ...save.league,
      standings,
      games,
      scheduleGenerated: typeof league.scheduleGenerated === 'boolean' ? league.scheduleGenerated : false,
    },
  }
}

export function migrateToV6(input: unknown): GameSave {
  const save = input as GameSave

  const league = save.league as unknown as Record<string, unknown>
  const rules = save.league.rules as unknown as Record<string, unknown>

  const mergedRules: GameSave['league']['rules'] = {
    ...save.league.rules,
    maxCashPerSide: typeof rules.maxCashPerSide === 'number' ? rules.maxCashPerSide : 1_000_000,
    pickFreezeYears: typeof rules.pickFreezeYears === 'number' ? rules.pickFreezeYears : 7,
  } as GameSave['league']['rules']

  const teamsRaw = (league.teams as Record<string, Record<string, unknown>>) ?? {}
  const teams: GameSave['league']['teams'] = {}
  for (const [tid, t] of Object.entries(teamsRaw)) {
    teams[tid] = {
      ...t,
      tradeExceptions: Array.isArray(t.tradeExceptions) ? t.tradeExceptions : [],
      frozenPicks: Array.isArray(t.frozenPicks) ? t.frozenPicks : [],
      directionAutoUpdatedAt:
        typeof t.directionAutoUpdatedAt === 'string' ? t.directionAutoUpdatedAt : undefined,
      priorTaxpayerYears:
        typeof t.priorTaxpayerYears === 'number' ? t.priorTaxpayerYears : 0,
      taxpayerHistory: Array.isArray(t.taxpayerHistory) ? t.taxpayerHistory : [],
    } as GameSave['league']['teams'][string]
  }

  const picksRaw = (league.draftPicks as Array<Record<string, unknown>>) ?? []
  let draftPicks: GameSave['league']['draftPicks'] = picksRaw.map((p) => ({
    ...p,
    protected: typeof p.protected === 'string' ? p.protected : undefined,
    frozenUntilSeason:
      typeof p.frozenUntilSeason === 'string' ? p.frozenUntilSeason : undefined,
    stepienBlocked:
      typeof p.stepienBlocked === 'boolean' ? p.stepienBlocked : false,
  })) as GameSave['league']['draftPicks']

  if (draftPicks.length === 0 && Object.keys(teams).length > 0) {
    const currentSeason =
      typeof save.league.rules.seasonLabel === 'string'
        ? save.league.rules.seasonLabel
        : '2025-26'
    const draftRounds = typeof save.league.rules.draftRounds === 'number'
      ? save.league.rules.draftRounds
      : 2
    draftPicks = backfillDraftPicks(teams, currentSeason, draftRounds)
  }

  const activeProposals = Array.isArray(league.activeProposals)
    ? (league.activeProposals as unknown as GameSave['league']['activeProposals'])
    : []

  return {
    ...save,
    metadata: {
      ...save.metadata,
      schemaVersion: 6,
    },
    league: {
      ...save.league,
      rules: mergedRules,
      teams,
      draftPicks,
      activeProposals,
    } as unknown as GameSave['league'],
  }
}

function backfillDraftPicks(
  teams: GameSave['league']['teams'],
  currentSeason: string,
  draftRounds: number,
): DraftPick[] {
  const teamList = Object.values(teams)
  if (teamList.length === 0) return []
  const currentYear = parseSeasonStartYear(currentSeason)
  const picks: DraftPick[] = []
  for (let yearOffset = 1; yearOffset <= 5; yearOffset++) {
    const seasonYear = currentYear + yearOffset
    const seasonLabel = formatSeasonLabel(seasonYear)
    for (const team of teamList) {
      for (let round = 1; round <= draftRounds; round++) {
        picks.push({
          id: `pick-${team.id}-${seasonYear}-r${round}`,
          season: seasonLabel,
          round,
          pickNumber: 0,
          originalTeamId: team.id,
          currentTeamId: team.id,
          prospectId: null,
        })
      }
    }
  }
  return picks
}

function parseSeasonStartYear(season: string): number {
  const m = season.match(/^(\d{4})/)
  return m ? Number(m[1]) : new Date().getFullYear()
}

function formatSeasonLabel(startYear: number): string {
  const endYear = (startYear + 1) % 100
  return `${startYear}-${String(endYear).padStart(2, '0')}`
}

// Schema version history:
//   v1: M2 base save
//   v2: M3 money fields
//   v3, v5, v6: never shipped as canonical milestones (skipped in target chain)
//   v4: M9 trade fields, picks (plus v3 morale + v5 schedule in legacy path)
//   v7: M10 offseason, draft, FA, two-way
//   v8: M11 realism (fatigue, injuries history, training focus, load management)
//   Target migration path: v1 → v2 → v4 → v7 → v8

import {
  emptyHealth,
  hydrateDevelopment,
} from '@/game/models/defaults'
import { parseTrainingFocus } from '@/game/models/training'

export function migrateToV8(input: unknown): GameSave {
  const save = input as GameSave
  const league = save.league as unknown as Record<string, unknown>

  const playersRaw = (league.players as Record<string, Record<string, unknown>>) ?? {}
  const players: GameSave['league']['players'] = {}
  for (const [pid, raw] of Object.entries(playersRaw)) {
    const healthRaw = (raw.health as Record<string, unknown>) ?? {}
    const health = {
      ...emptyHealth(),
      ...healthRaw,
      injuryHistory: Array.isArray(healthRaw.injuryHistory)
        ? healthRaw.injuryHistory
        : [],
    }
    const development = hydrateDevelopment(
      (raw.development as Record<string, unknown>) ?? {},
    )
    players[pid] = {
      ...(raw as unknown as GameSave['league']['players'][string]),
      fatigue: typeof raw.fatigue === 'number' ? raw.fatigue : 0,
      health,
      development,
    }
  }

  const teamsRaw = (league.teams as Record<string, Record<string, unknown>>) ?? {}
  const teams: GameSave['league']['teams'] = {}
  for (const [tid, t] of Object.entries(teamsRaw)) {
    teams[tid] = {
      ...(t as unknown as GameSave['league']['teams'][string]),
      trainingFocus: parseTrainingFocus(t.trainingFocus),
      loadManagement: Array.isArray(t.loadManagement) ? t.loadManagement : [],
    }
  }

  return {
    ...save,
    metadata: {
      ...save.metadata,
      schemaVersion: 8,
    },
    settings: {
      ...save.settings,
      injuries: save.settings.injuries ?? true,
      fatigue: save.settings.fatigue ?? true,
    },
    league: {
      ...save.league,
      players,
      teams,
      awardsHistory: Array.isArray(league.awardsHistory)
        ? (league.awardsHistory as GameSave['league']['awardsHistory'])
        : save.league.awardsHistory ?? [],
      awardRaces:
        league.awardRaces && typeof league.awardRaces === 'object'
          ? (league.awardRaces as GameSave['league']['awardRaces'])
          : {},
    } as unknown as GameSave['league'],
  }
}

export function migrateToV7(input: unknown): GameSave {
  const save = input as GameSave
  const league = save.league as unknown as Record<string, unknown>

  const teamsRaw = (league.teams as Record<string, Record<string, unknown>>) ?? {}
  const teams: GameSave['league']['teams'] = {}
  for (const [tid, t] of Object.entries(teamsRaw)) {
    teams[tid] = {
      ...t,
      twoWayPlayers: Array.isArray(t.twoWayPlayers) ? t.twoWayPlayers : [],
    } as GameSave['league']['teams'][string]
  }

  return {
    ...save,
    metadata: {
      ...save.metadata,
      schemaVersion: 7,
    },
    league: {
      ...save.league,
      teams,
      drafts: (league.drafts as GameSave['league']['drafts']) ?? {},
      scoutingState: (league.scoutingState as GameSave['league']['scoutingState']) ?? {},
      freeAgentOffers: Array.isArray(league.freeAgentOffers)
        ? (league.freeAgentOffers as GameSave['league']['freeAgentOffers'])
        : [],
      qualifyingOffers: Array.isArray(league.qualifyingOffers)
        ? (league.qualifyingOffers as GameSave['league']['qualifyingOffers'])
        : [],
      compensationPicks: Array.isArray(league.compensationPicks)
        ? (league.compensationPicks as GameSave['league']['compensationPicks'])
        : [],
      offseasonLog: Array.isArray(league.offseasonLog)
        ? (league.offseasonLog as GameSave['league']['offseasonLog'])
        : [],
      rosterSizeCap:
        typeof league.rosterSizeCap === 'number' ? league.rosterSizeCap : 15,
      draftClasses: (league.draftClasses as GameSave['league']['draftClasses']) ?? {},
    } as unknown as GameSave['league'],
  }
}

export function migrateToCurrent(input: unknown): GameSave {
  let save = input as GameSave
  const version = save.metadata.schemaVersion

  if (version === 1) {
    save = migrateToV2(save)
  }
  if (save.metadata.schemaVersion === 2) {
    save = migrateToV3(save)
    save = migrateToV4(save)
    save = migrateToV5(save)
    save = migrateToV6(save)
  } else if (save.metadata.schemaVersion === 3) {
    save = migrateToV4(save)
    save = migrateToV5(save)
    save = migrateToV6(save)
  } else if (save.metadata.schemaVersion === 4) {
    save = migrateToV5(save)
    save = migrateToV6(save)
  } else if (save.metadata.schemaVersion === 5) {
    save = migrateToV6(save)
  }

  if (save.metadata.schemaVersion < 7) {
    save = migrateToV7(save)
  }

  if (save.metadata.schemaVersion < 8) {
    save = migrateToV8(save)
  }

  return save
}
