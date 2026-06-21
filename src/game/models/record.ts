export type RecordCategory =
  | 'single_game_points'
  | 'single_game_assists'
  | 'single_game_rebounds'
  | 'season_ppg'
  | 'season_apg'
  | 'season_rpg'
  | 'career_points'
  | 'career_assists'
  | 'career_rebounds'
  | 'career_championships'
  | 'team_wins_season'
  | 'team_championships'

export interface LeagueRecord {
  id: string
  category: RecordCategory
  playerId?: string
  teamId?: string
  value: number
  seasonYear?: number
  date?: string
  previousHolder?: string
}

export function createRecordId(category: RecordCategory, holderId: string, seasonYear?: number): string {
  return seasonYear !== undefined
    ? `${category}-${holderId}-${seasonYear}`
    : `${category}-${holderId}`
}
