import type { AwardWinner } from './award'
import type { Champion } from './champion'
import type { Contract } from './contract'
import type { EraConfig } from './eraConfig'
import type { OwnerProfile } from './owner'
import type { PlayerSeasonStats } from './playerSeasonStats'
import type { Position } from './position'
import type { PlayerRatings } from './ratings'
import type { PlayerTendencies } from './tendencies'
import type { PlayerTraits } from './traits'
import type { LeagueRules } from './leagueRules'

export interface StaticTeam {
  id: string
  externalId?: string
  city: string
  name: string
  abbreviation: string
  conference: 'East' | 'West'
  division: string
  colors: { primary: string; secondary: string }
  arena?: string
  capacity?: number
  marketSize: number
  prestige: number
  fanPatience: number
  owner?: OwnerProfile
}

export interface StaticPlayer {
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
  headshotUrl?: string
  college?: string
  country?: string
  draftYear?: number
  draftRound?: number
  draftPick?: number
  birthDate?: string

  ratings: PlayerRatings
  tendencies: PlayerTendencies
  traits: PlayerTraits
  contract: Contract

  importMeta?: {
    snapshotSeason: string
    statsSource: string
    lastUpdated: string
  }
}

export interface StaticSnapshot {
  id: string
  name: string
  type: 'nba' | 'fictional'
  seasonLabel: string
  startYear: number
  teams: StaticTeam[]
  players: StaticPlayer[]
  seasonStats: PlayerSeasonStats[]
  careerStats: import('./playerCareerStats').PlayerCareerStats[]
  eraConfig: EraConfig
  rules: LeagueRules
  awards: AwardWinner[]
  champions: Champion[]
}

export interface DataManifestEntry {
  id: string
  name: string
  type: 'nba' | 'fictional'
  seasonLabel: string
  startYear: number
  basePath: string
  teamCount: number
  playerCount: number
}

export interface DataManifest {
  version: string
  defaultSnapshotId: string
  snapshots: DataManifestEntry[]
}
