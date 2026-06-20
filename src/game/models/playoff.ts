export interface PlayoffSeries {
  id: string
  conference: 'East' | 'West' | 'Finals'
  round: 1 | 2 | 3 | 4
  higherSeedTeamId: string
  lowerSeedTeamId: string
  higherSeed: number
  lowerSeed: number
  seriesLength: 1 | 3 | 5 | 7
  higherSeedWins: number
  lowerSeedWins: number
  status: 'scheduled' | 'in_progress' | 'final'
  games: string[]
  winnerTeamId?: string
  isUpset: boolean
  startDate: string
  endDate?: string
}

export interface PlayInGame {
  id: string
  conference: 'East' | 'West'
  matchup: '7v8' | '9v10' | 'final_playin'
  homeTeamId: string
  awayTeamId: string
  winnerTeamId?: string
  scheduledGameId: string
}

export interface PlayInBracket {
  east: PlayInGame[]
  west: PlayInGame[]
  playInWinners?: {
    east7: string
    east8: string
    west7: string
    west8: string
  }
}

export interface PlayoffBracket {
  seasonYear: number
  format: 'top8' | 'playin_then_top8' | 'top6_playin_7_10'
  playIn?: PlayInBracket
  east: PlayoffSeries[]
  west: PlayoffSeries[]
  finals?: PlayoffSeries
  status: 'pending' | 'play_in' | 'bracket' | 'finals' | 'complete'
  championTeamId?: string
  finalsMvpPlayerId?: string
  runnerUpTeamId?: string
}

export type PlayoffRound = 1 | 2 | 3 | 4

export function getSeriesRoundLabel(round: PlayoffRound): string {
  switch (round) {
    case 1: return 'First Round'
    case 2: return 'Conference Semifinals'
    case 3: return 'Conference Finals'
    case 4: return 'Finals'
  }
}

export function getPlayoffSeedLabel(seed: number): string {
  return `${seed}`
}
