import type { Contract } from './contract'
import type { PlayerSeasonStats } from './playerSeasonStats'
import type { Position } from './position'
import type { PlayerRatings } from './ratings'
import type { PlayerTendencies } from './tendencies'
import type { PlayerTraits } from './traits'

export interface PlayerMorale {
  level: number
  happiness: number
  roleSatisfaction: number
  teamSatisfaction: number
  tradeRequest: boolean
  tradeRequestLevel: number
}

export interface PlayerHealth {
  status:
    | 'healthy'
    | 'day_to_day'
    | 'short_term'
    | 'long_term'
    | 'season_ending'
  injuryDescription: string | null
  daysRemaining: number
  gamesRemaining: number
}

export interface PlayerDevelopment {
  lastTrainedAt: string | null
  focusArea: string | null
  recentForm: number
  ageAtPeak: number
  progressionCurve: 'early' | 'normal' | 'late' | 'veteran_decline'
  ratingsDelta: Record<string, number>
  breakoutChance: number
  bustRisk: number
}

export interface PlayerSeasonStat {
  season: string
  teamId: string | null
  gamesPlayed: number
  minutes: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fieldGoalsMade: number
  fieldGoalsAttempted: number
  threePointersMade: number
  threePointersAttempted: number
  freeThrowsMade: number
  freeThrowsAttempted: number
  plusMinus: number
}

export type PlayerCareerStatsEntry = PlayerSeasonStat

export interface Player {
  id: string
  externalId?: string
  firstName: string
  lastName: string
  age: number
  position: Position
  secondaryPositions: Position[]
  heightInches: number
  weightLbs: number
  teamId: string | null

  ratings: PlayerRatings
  tendencies: PlayerTendencies
  traits: PlayerTraits

  contract: Contract
  morale: PlayerMorale
  health: PlayerHealth
  development: PlayerDevelopment

  seasonStats: PlayerSeasonStat
  careerStats: PlayerCareerStatsEntry[]

  historicalSeasons: PlayerSeasonStats[]
}
