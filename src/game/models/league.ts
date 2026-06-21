import type { Champion } from './champion'
import type { AwardWinner } from './award'
import type { Player } from './player'
import type { Team } from './team'
import type { ScheduledGame, TeamStanding } from './game'
import type { Transaction } from './transaction'
import type { NewsEvent } from './news'
import type { AwardSeason } from './award'
import type { DraftPick, DraftClass, Draft, TeamScoutingState } from './draft'
import type { FreeAgentOffer, QualifyingOffer } from './freeAgent'
import type { CompensationPick } from './compensationPick'
import type { OffseasonEvent } from './offseason'
import type { EraConfig } from './eraConfig'
import type { LeagueRules } from './leagueRules'
import type { PlayoffBracket } from './playoff'
import type { TradeProposal } from './trade'
import type { Rivalry } from './rivalry'
import type { LeagueRecord } from './record'
import type { HallOfFameEntry } from './hallOfFame'

export type TeamSeasonResult =
  | 'missed_playoffs'
  | 'first_round_loss'
  | 'second_round_loss'
  | 'conference_finals_loss'
  | 'finals_loss'
  | 'champion'

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
  scheduleGenerated: boolean
  transactions: Transaction[]
  news: NewsEvent[]
  awardsHistory: AwardSeason[]
  draftPicks: DraftPick[]
  draftClasses: Record<string, DraftClass>
  drafts: Record<string, Draft>
  scoutingState: Record<string, TeamScoutingState>
  freeAgentOffers: FreeAgentOffer[]
  qualifyingOffers: QualifyingOffer[]
  compensationPicks: CompensationPick[]
  offseasonLog: OffseasonEvent[]
  rosterSizeCap: number
  champions: Champion[]
  awards: AwardWinner[]

  activeProposals: TradeProposal[]

  /** playerId -> seasonLabel when the player was last traded. Used for 2nd-apron reacquire rule. */
  recentlyTraded?: Record<string, string>

  playoffBracket?: PlayoffBracket

  rivalries: Record<string, Rivalry>
  records: LeagueRecord[]
  hallOfFame: HallOfFameEntry[]

  userTeamId: string
  /** Award race snapshots updated during the season. */
  awardRaces?: Record<string, import('./award').AwardRaceEntry[]>
}

export { type LeagueRules } from './leagueRules'
