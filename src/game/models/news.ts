export type NewsType =
  | 'game_result'
  | 'player_injury'
  | 'trade_rumor'
  | 'trade_completed'
  | 'signing'
  | 'draft_pick'
  | 'award_race'
  | 'coach_pressure'
  | 'player_morale'
  | 'record_broken'
  | 'playoff_upset'
  | 'championship'

export type NewsImportance = 'low' | 'medium' | 'high'

export interface NewsEvent {
  id: string
  date: string
  type: NewsType
  headline: string
  body: string
  teamIds: string[]
  playerIds: string[]
  importance: NewsImportance
}
