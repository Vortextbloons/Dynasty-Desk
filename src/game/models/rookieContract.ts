export interface RookieContract {
  id: string
  playerId: string
  teamId: string
  yearsTotal: number
  yearsGuaranteed: number
  salaryByYear: number[]
  optionYear: number | null
  optionType: 'team' | 'player' | 'none'
  draftPickResultId: string
  isTwoWay: boolean
}
