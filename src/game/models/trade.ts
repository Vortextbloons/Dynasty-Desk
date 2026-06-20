export type TradeProposalStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'vetoed'
  | 'expired'

export type TradeAssetType = 'player' | 'pick' | 'cash' | 'exception'

export interface TradeAsset {
  type: TradeAssetType
  playerId?: string
  pickId?: string
  cashAmount?: number
  exceptionId?: string
}

export interface TradeSide {
  teamId: string
  outgoing: TradeAsset[]
  incoming: TradeAsset[]
}

export interface TradeProposal {
  id: string
  sides: TradeSide[]
  createdAt: string
  status: TradeProposalStatus
  rejectionReason?: string
  vetoReason?: string
  vetoingOwnerName?: string
  vetoingTeamId?: string
}

export type TradeExceptionSource =
  | 'outgoing_salary'
  | 'sign_and_trade'
  | 'disabled_player'

export interface TradeException {
  id: string
  teamId: string
  amount: number
  expiresAt: string
  source: TradeExceptionSource
}
