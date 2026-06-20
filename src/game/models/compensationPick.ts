export interface CompensationPick {
  id: string
  seasonYear: number
  round: 2
  originalTeamId: string
  currentTeamId: string
  reason: 'outgoing_free_agent'
  amount: number
  threshold: 'standard' | 'high_value'
  playerId: string
}
