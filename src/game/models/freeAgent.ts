export type FreeAgentExceptionType =
  | 'mle'
  | 'bae'
  | 'room_mle'
  | 'minimum'
  | 'bird'
  | 'early_bird'
  | 'non_bird'
  | 'rookie'
  | 'two_way'

export interface FreeAgentOffer {
  id: string
  playerId: string
  teamId: string
  years: number
  salaryByYear: number[]
  exceptionUsed?: FreeAgentExceptionType
  exceptionAmount?: number
  offeredAt: string
  status: 'pending' | 'accepted' | 'rejected' | 'matched' | 'expired' | 'withdrawn'
  matchedByTeamId?: string
  matchDeadline: string
}

export interface QualifyingOffer {
  id: string
  playerId: string
  teamId: string
  amount: number
  years: number
  expiresAt: string
  acceptedAt?: string
}

export type BirdRightsType = 'bird' | 'early_bird' | 'non_bird'

export interface FreeAgentOfferInput {
  years: number
  salaryByYear: number[]
  exceptionUsed?: FreeAgentExceptionType
}
