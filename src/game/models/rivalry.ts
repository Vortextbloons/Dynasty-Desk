export interface Rivalry {
  id: string
  teamAId: string
  teamBId: string
  playoffMeetings: number
  playoffWinsA: number
  playoffWinsB: number
  regularSeasonGames: number
  hotPlayer: { playerId: string; ppgVsOpponent: number } | null
  lastMeetingDate: string
  intensityScore: number
}

export function createRivalryId(teamAId: string, teamBId: string): string {
  return teamAId < teamBId ? `${teamAId}-${teamBId}` : `${teamBId}-${teamAId}`
}

export function emptyRivalry(teamAId: string, teamBId: string): Rivalry {
  const id = createRivalryId(teamAId, teamBId)
  return {
    id,
    teamAId,
    teamBId,
    playoffMeetings: 0,
    playoffWinsA: 0,
    playoffWinsB: 0,
    regularSeasonGames: 0,
    hotPlayer: null,
    lastMeetingDate: '',
    intensityScore: 0,
  }
}
