export type InjurySeverity =
  | 'minor'
  | 'day_to_day'
  | 'short_term'
  | 'long_term'
  | 'season_ending'

export interface InjuryEvent {
  id: string
  playerId: string
  teamId: string
  occurredAt: string
  severity: InjurySeverity
  description: string
  gamesRemaining: number
}
