export type OwnerPersonality =
  | 'spendthrift'
  | 'patient'
  | 'win_now'
  | 'frugal'
  | 'meddler'
  | 'hands_off'

export interface OwnerProfile {
  teamId: string
  name: string
  personality: OwnerPersonality
  netWorth: number
  cash: number
  softCashPressureSeasons: number
}
