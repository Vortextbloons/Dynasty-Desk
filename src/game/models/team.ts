import type { OwnerProfile } from './owner'
import type { TradeException } from './trade'

export interface OffensiveStrategy {
  pace: 'slow' | 'balanced' | 'fast'
  shotProfile: 'paint' | 'balanced' | 'three_heavy'
  primaryAction:
    | 'pick_and_roll'
    | 'motion'
    | 'isolation'
    | 'post'
    | 'transition'
  usageDistribution: 'star_led' | 'balanced' | 'bench_involved'
  crashOffensiveGlass: 'low' | 'medium' | 'high'
}

export interface DefensiveStrategy {
  pickAndRollCoverage: 'drop' | 'switch' | 'blitz'
  helpDefense: 'conservative' | 'balanced' | 'aggressive'
  pressure: 'low' | 'medium' | 'high'
  reboundingFocus: 'secure_boards' | 'balanced' | 'leak_out'
  physicality: 'conservative' | 'balanced' | 'physical'
}

export interface TeamStrategy {
  offense: OffensiveStrategy
  defense: DefensiveStrategy
}

export interface TeamExceptionBook {
  mle: boolean
  bae: boolean
  roomMle: boolean
  minimumCount: number
}

export interface TeamFinances {
  salaryCap: number
  apron: number
  secondApron: number
  luxuryTaxLine: number
  payroll: number
  capSpace: number
  taxBill: number
  projectedTaxBill: number

  baseRevenue: number
  localRevenue: number
  seasonPerformanceBonus: number
  totalRevenue: number

  operatingExpenses: number
  totalExpenses: number
  netIncome: number

  ownerCash: number
  cashReserves: number
  ownerPatience: number

  exceptionsUsed: TeamExceptionBook
}

export type TeamDirection =
  | 'contender'
  | 'playoff_push'
  | 'middle'
  | 'retooling'
  | 'rebuilding'
  | 'tanking'

export type RotationWarning =
  | 'not_five_starters'
  | 'not_five_closing'
  | 'minutes_not_240'
  | 'duplicate_player'
  | 'injured_player_in_rotation'
  | 'injured_player_force_included'
  | 'player_not_on_roster'
  | 'no_ball_handler'
  | 'no_center'
  | 'bench_too_large'

export interface RotationValidationWarning {
  code: RotationWarning
  playerIds?: string[]
  message: string
}

export interface RotationValidation {
  ok: boolean
  warnings: RotationValidationWarning[]
  totalMinutes: number
}

export interface LineupRating {
  spacing: number
  shotCreation: number
  passing: number
  rimPressure: number
  perimeterDefense: number
  interiorDefense: number
  rebounding: number
  transition: number
  benchBalance: number
  size: number
  switchability: number
  overall: number
}

export interface LineupSettings {
  starters: string[]
  bench: string[]
  closingLineup: string[]
  targetMinutes: Record<string, number>
  autoRotation: boolean
  lastValidatedAt?: string
  lastValidationWarnings?: RotationWarning[]
  generatedByAutoRotate?: boolean
  forceInclude?: Record<string, boolean>
}

export interface Team {
  id: string
  city: string
  name: string
  abbreviation: string
  conference: 'East' | 'West'
  division: string
  colors: { primary: string; secondary: string }

  roster: string[]
  lineup: LineupSettings
  strategy: TeamStrategy
  finances: TeamFinances
  direction: TeamDirection
  directionAutoUpdatedAt?: string

  chemistry: number
  morale: number
  prestige: number

  owner?: OwnerProfile

  tradeExceptions: TradeException[]
  frozenPicks: string[]
  priorTaxpayerYears: number
  taxpayerHistory: number[]
}
