import type { BoxScoreResult } from '@/game/models/sim'

export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed'

export interface ScheduledGame {
  id: string
  season: string
  date: string
  homeTeamId: string
  awayTeamId: string
  status: GameStatus
  homeScore: number | null
  awayScore: number | null
  boxScoreId: string | null
  boxScore?: BoxScoreResult | null
}

export interface TeamStanding {
  teamId: string
  season: string
  gamesPlayed: number
  wins: number
  losses: number
  winPct: number
  homeWins: number
  homeLosses: number
  awayWins: number
  awayLosses: number
  pointsFor: number
  pointsAgainst: number
  pointDifferential: number
  conferenceRank: number
  divisionRank: number
  streak: number
  last10: string
  clinchedPlayoff: boolean
  clinchedDivision: boolean
  eliminated: boolean
}
