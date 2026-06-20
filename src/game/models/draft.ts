import type { Position } from './position'
import type { PlayerRatings } from './ratings'

export interface DraftProspect {
  id: string
  firstName: string
  lastName: string
  age: number
  position: Position
  heightInches: number
  weightLbs: number
  archetype: string
  visibleRatings: Partial<PlayerRatings>
  trueRatings: PlayerRatings
  visiblePotentialRange: [number, number]
  truePotential: number
  scoutingReport: string[]
  riskLevel: 'low' | 'medium' | 'high'
  projectedRange: [number, number]
}

export interface DraftClass {
  season: string
  prospects: DraftProspect[]
}

export interface DraftPick {
  id: string
  season: string
  round: number
  pickNumber: number
  originalTeamId: string
  currentTeamId: string
  prospectId: string | null
}
