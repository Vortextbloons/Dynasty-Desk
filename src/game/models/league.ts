import type { Champion } from './champion'
import type { AwardWinner } from './award'
import type { Player } from './player'
import type { Team } from './team'
import type { ScheduledGame, TeamStanding } from './game'
import type { Transaction } from './transaction'
import type { NewsEvent } from './news'
import type { AwardSeason } from './award'
import type { DraftPick, DraftClass } from './draft'
import type { EraConfig } from './eraConfig'
import type { LeagueRules } from './leagueRules'

export type LeaguePhase =
  | 'preseason'
  | 'regular_season'
  | 'play_in'
  | 'playoffs'
  | 'offseason'
  | 'draft'
  | 'free_agency'

export interface LeagueState {
  id: string
  name: string
  currentDate: string
  seasonYear: number
  phase: LeaguePhase
  rules: LeagueRules
  eraConfig: EraConfig
  snapshotId: string

  teams: Record<string, Team>
  players: Record<string, Player>
  games: Record<string, ScheduledGame>
  standings: Record<string, TeamStanding>
  transactions: Transaction[]
  news: NewsEvent[]
  awardsHistory: AwardSeason[]
  draftPicks: DraftPick[]
  draftClasses: Record<string, DraftClass>
  champions: Champion[]
  awards: AwardWinner[]
}

export { type LeagueRules } from './leagueRules'
