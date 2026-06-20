import type { GameSave } from '@/game/models'
import type { TeamFinances } from '@/game/models/team'
import {
  OPERATING_EXPENSES_BASELINE,
  OWNER_CASH_INITIAL,
  CASH_RESERVES_INITIAL,
  OWNER_PATIENCE_INITIAL,
} from '@/game/management/financeConstants'

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

  const leaguePlayers = v1.league.players as Record<string, Record<string, unknown>>

  const teams: GameSave['league']['teams'] = {}
  for (const [teamId, teamRaw] of Object.entries(v1.league.teams)) {
    const team = teamRaw as Record<string, unknown>
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
