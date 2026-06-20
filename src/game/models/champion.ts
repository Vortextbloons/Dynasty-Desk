export interface Champion {
  season: string
  championTeamId: string
  runnerUpTeamId: string
  finalsMvpPlayerId: string
  seriesResult: string
}

export interface ChampionsFile {
  version: string
  updatedAt: string
  champions: Champion[]
}
