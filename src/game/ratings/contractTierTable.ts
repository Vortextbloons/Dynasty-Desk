import { clampRating } from '@/game/models/ratings'

interface SalaryTier {
  minOverall: number
  salary: number
}

const SALARY_TIERS: SalaryTier[] = [
  { minOverall: 95, salary: 65_000_000 },
  { minOverall: 90, salary: 55_000_000 },
  { minOverall: 85, salary: 45_000_000 },
  { minOverall: 80, salary: 35_000_000 },
  { minOverall: 75, salary: 26_000_000 },
  { minOverall: 70, salary: 18_000_000 },
  { minOverall: 65, salary: 12_000_000 },
  { minOverall: 60, salary: 7_000_000 },
  { minOverall: 55, salary: 3_000_000 },
  { minOverall: 50, salary: 1_500_000 },
]

export function getBaseSalary(overallRating: number): number {
  const clamped = clampRating(overallRating)
  for (const tier of SALARY_TIERS) {
    if (clamped >= tier.minOverall) return tier.salary
  }
  return 1_500_000
}

export function getContractYears(yearsInLeague: number): number {
  if (yearsInLeague <= 3) return 1
  if (yearsInLeague <= 6) return 2
  return 4
}

export const ANNUAL_RAISE_PCT = 0.08
