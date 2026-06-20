export type ContractOption = "team" | "player" | "none";

export type Contract = {
  salaryByYear: number[];
  yearsRemaining: number;
  option: ContractOption;
  noTradeClause: boolean;
  guaranteed: boolean;
};

export function emptyContract(salary: number = 0, years: number = 1): Contract {
  return {
    salaryByYear: Array.from({ length: years }, () => salary),
    yearsRemaining: years,
    option: "none",
    noTradeClause: false,
    guaranteed: false,
  };
}
