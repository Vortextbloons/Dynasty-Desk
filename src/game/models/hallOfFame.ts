import type { PlayerCareerStats } from './playerCareerStats'

export interface HallOfFameEntry {
  id: string
  playerId: string
  inductedSeason: number
  careerStats: PlayerCareerStats
  accolades: {
    awards: string[]
    championships: number
    allStarSelections: number
  }
  votePercent: number
}
