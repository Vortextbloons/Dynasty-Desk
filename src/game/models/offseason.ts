export type OffseasonEventType =
  | 'phase_advance'
  | 'contract_expired'
  | 'option_decided'
  | 'qualifying_offer'
  | 'comp_pick'
  | 'lottery'
  | 'draft_pick'
  | 'signing'
  | 'match_sheet'
  | 'two_way'
  | 'roster_change'

export interface OffseasonEvent {
  id: string
  date: string
  type: OffseasonEventType
  headline: string
  body: string
  teamIds: string[]
  playerIds: string[]
}
