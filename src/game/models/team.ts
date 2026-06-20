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

export interface TeamFinances {
  salaryCap: number
  payroll: number
  luxuryTaxLine: number
  capSpace: number
  taxBill: number
}

export type TeamDirection =
  | 'contender'
  | 'playoff_push'
  | 'middle'
  | 'retooling'
  | 'rebuilding'
  | 'tanking'

export interface LineupSettings {
  starters: string[]
  bench: string[]
  closingLineup: string[]
  targetMinutes: Record<string, number>
  autoRotation: boolean
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

  chemistry: number
  morale: number
  prestige: number
}
