export type ContractOption = 'team' | 'player' | 'none'

export interface Contract {
  salaryByYear: number[]
  yearsRemaining: number
  option: ContractOption
  noTradeClause: boolean
  guaranteed: boolean
}

export function emptyContract(salary = 0, years = 1): Contract {
  return {
    salaryByYear: Array.from({ length: years }, () => salary),
    yearsRemaining: years,
    option: 'none',
    noTradeClause: false,
    guaranteed: false,
  }
}
