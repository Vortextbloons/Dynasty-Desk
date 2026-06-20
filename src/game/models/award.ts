export type AwardType =
  | 'mvp'
  | 'dpoy'
  | 'roy'
  | 'smoy'
  | 'mip'
  | 'coty'
  | 'finals_mvp'
  | 'all_nba_1'
  | 'all_nba_2'
  | 'all_nba_3'
  | 'all_defense_1'
  | 'all_defense_2'

export const AWARD_LABELS: Readonly<Record<AwardType, string>> = {
  mvp: 'MVP',
  dpoy: 'Defensive Player of the Year',
  roy: 'Rookie of the Year',
  smoy: 'Sixth Man of the Year',
  mip: 'Most Improved Player',
  coty: 'Coach of the Year',
  finals_mvp: 'Finals MVP',
  all_nba_1: 'All-NBA First Team',
  all_nba_2: 'All-NBA Second Team',
  all_nba_3: 'All-NBA Third Team',
  all_defense_1: 'All-Defense First Team',
  all_defense_2: 'All-Defense Second Team',
}

export const AWARD_SHORT_LABELS: Readonly<Record<AwardType, string>> = {
  mvp: 'MVP',
  dpoy: 'DPOY',
  roy: 'ROY',
  smoy: '6MOY',
  mip: 'MIP',
  coty: 'COTY',
  finals_mvp: 'Finals MVP',
  all_nba_1: 'All-NBA 1',
  all_nba_2: 'All-NBA 2',
  all_nba_3: 'All-NBA 3',
  all_defense_1: 'All-Def 1',
  all_defense_2: 'All-Def 2',
}

export interface AwardWinner {
  season: string
  award: AwardType
  playerId: string
  teamId: string
}

export interface AwardSeason {
  season: string
  awards: AwardWinner[]
  champions: import('./champion').Champion[]
}
