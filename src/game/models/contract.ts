export type ContractOption = 'team' | 'player' | 'none'

export interface TradeKicker {
  condition: 'on_roster_date' | 'minutes_threshold' | 'games_played'
  threshold: number
  amount: number
}

export interface DeferredMoney {
  amount: number
  payDate: string
}

export interface Contract {
  salaryByYear: number[]
  yearsRemaining: number
  option: ContractOption
  optionYear: number | null
  noTradeClause: boolean

  signingBonusByYear: number[]
  likelyBonusesByYear: number[]
  unlikelyBonusesByYear: number[]

  guaranteed: boolean
  guaranteedByYear: boolean[]

  tradeKickers: TradeKicker[]
  poisonPill: boolean

  birdRights: boolean
  earlyBird: boolean
  baseYearCompensation: boolean

  deferredMoney: DeferredMoney[]
}

export function emptyContract(salary = 0, years = 1): Contract {
  return {
    salaryByYear: Array.from({ length: years }, () => salary),
    yearsRemaining: years,
    option: 'none',
    optionYear: null,
    noTradeClause: false,

    signingBonusByYear: Array.from({ length: years }, () => 0),
    likelyBonusesByYear: Array.from({ length: years }, () => 0),
    unlikelyBonusesByYear: Array.from({ length: years }, () => 0),

    guaranteed: false,
    guaranteedByYear: Array.from({ length: years }, () => false),

    tradeKickers: [],
    poisonPill: false,

    birdRights: false,
    earlyBird: false,
    baseYearCompensation: false,

    deferredMoney: [],
  }
}
