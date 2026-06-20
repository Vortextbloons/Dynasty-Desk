export type InjurySeverity =
  | 'minor'
  | 'day_to_day'
  | 'short_term'
  | 'long_term'
  | 'season_ending'

export type InjuryType = 'contact' | 'non_contact' | 'overuse' | 'fatigue'

/** Persistent injury history entry on a player. */
export interface InjuryRecord {
  id: string
  date: string
  type: InjuryType
  bodyPart: string
  severity: InjurySeverity
  daysOut: number
  recoveredAt?: string
}

/** In-game injury event emitted during simulation. */
export interface InjuryEvent {
  id: string
  playerId: string
  teamId: string
  occurredAt: string
  severity: InjurySeverity
  description: string
  gamesRemaining: number
}
