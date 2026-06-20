export type TransactionType =
  | 'trade'
  | 'signing'
  | 'release'
  | 'draft'
  | 'extension'
  | 'waiver'
  | 'buyout'

export interface Transaction {
  id: string
  date: string
  type: TransactionType
  teamIds: string[]
  playerIds: string[]
  pickIds: string[]
  description: string
}
