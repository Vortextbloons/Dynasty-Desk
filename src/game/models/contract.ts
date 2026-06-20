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
  return createContract({
    salaryByYear: Array.from({ length: years }, () => salary),
    yearsRemaining: years,
  })
}

export function createContract(overrides: Partial<Contract> = {}): Contract {
  const years = overrides.yearsRemaining ?? overrides.salaryByYear?.length ?? 1
  const salaryByYear =
    overrides.salaryByYear ?? Array.from({ length: years }, () => 0)

  return {
    salaryByYear,
    yearsRemaining: overrides.yearsRemaining ?? years,
    option: overrides.option ?? 'none',
    optionYear: overrides.optionYear ?? null,
    noTradeClause: overrides.noTradeClause ?? false,

    signingBonusByYear:
      overrides.signingBonusByYear ??
      Array.from({ length: salaryByYear.length }, () => 0),
    likelyBonusesByYear:
      overrides.likelyBonusesByYear ??
      Array.from({ length: salaryByYear.length }, () => 0),
    unlikelyBonusesByYear:
      overrides.unlikelyBonusesByYear ??
      Array.from({ length: salaryByYear.length }, () => 0),

    guaranteed: overrides.guaranteed ?? false,
    guaranteedByYear:
      overrides.guaranteedByYear ??
      Array.from({ length: salaryByYear.length }, () => false),

    tradeKickers: overrides.tradeKickers ?? [],
    poisonPill: overrides.poisonPill ?? false,

    birdRights: overrides.birdRights ?? false,
    earlyBird: overrides.earlyBird ?? false,
    baseYearCompensation: overrides.baseYearCompensation ?? false,

    deferredMoney: overrides.deferredMoney ?? [],
  }
}
