import type { Position } from './position'
import type { PlayerRatings } from './ratings'

export interface DraftProspect {
  id: string
  draftClassId: string
  firstName: string
  lastName: string
  age: number
  position: Position
  secondaryPositions: Position[]
  heightInches: number
  weightLbs: number
  archetype: string

  visibleRatings: Partial<PlayerRatings>
  trueRatings: PlayerRatings
  visiblePotentialRange: [number, number]
  truePotential: number
  projectedRange: [number, number]
  scoutingReport: string[]
  riskLevel: 'low' | 'medium' | 'high'

  scoutingPoints: number
  scoutedByTeamId: string | null

  bustRisk: number
  breakoutChance: number

  source: 'real' | 'synthetic'
  externalId?: string
}

export interface DraftClass {
  id: string
  seasonYear: number
  season: string
  generatedAt: string
  prospects: DraftProspect[]
  generatedBy: 'hybrid'
  realProspectCount: number
  syntheticProspectCount: number
}

export interface DraftPickResult {
  id: string
  draftId: string
  pickId: string
  prospectId: string
  pickedByTeamId: string
  pickNumber: number
  round: 1 | 2
  signedAt?: string
  rookieContractId?: string
  isTwoWay: boolean
}

export interface Draft {
  id: string
  seasonYear: number
  draftClassId: string
  status: 'pending' | 'lottery' | 'in_progress' | 'complete'
  lotteryResults?: { teamId: string; pickNumber: number }[]
  picks: DraftPickResult[]
  currentPickNumber: number
  startedAt: string
  completedAt?: string
  orderSource: 'lottery' | 'inverse_record'
}

/** Trade asset pick — distinct from draft-night pick result */
export interface DraftPick {
  id: string
  season: string
  round: number
  pickNumber: number
  originalTeamId: string
  currentTeamId: string
  prospectId: string | null
  protected?: string
  frozenUntilSeason?: string
  stepienBlocked?: boolean
}

export interface TeamScoutingState {
  teamId: string
  draftClassId: string
  pointsRemaining: number
  allocations: Record<string, number>
}
