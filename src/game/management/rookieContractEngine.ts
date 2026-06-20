import type { LeagueRules } from '@/game/models/leagueRules'
import type { RookieContract } from '@/game/models/rookieContract'

/** Approximate 2024-25 rookie scale (slot 1 ≈ $10.5M, slot 30 ≈ $2.5M) */
const FIRST_ROUND_SCALE: number[] = [
  10_512_000, 9_456_000, 8_508_000, 7_668_000, 6_936_000,
  6_300_000, 5_760_000, 5_304_000, 4_932_000, 4_620_000,
  4_356_000, 4_128_000, 3_924_000, 3_744_000, 3_588_000,
  3_444_000, 3_312_000, 3_192_000, 3_084_000, 2_988_000,
  2_892_000, 2_808_000, 2_724_000, 2_652_000, 2_580_000,
  2_520_000, 2_460_000, 2_412_000, 2_364_000, 2_316_000,
]

const TWO_WAY_ANNUAL = 559_782
const TWO_WAY_YEARS = 2
const TWO_WAY_GUARANTEED = 1

export function getRookieScaleSalary(pickNumber: number, rules: LeagueRules): number {
  if (rules.rookieScale === 'flat') {
    return rules.minimumPlayerSalary * 2
  }
  if (pickNumber <= 0 || pickNumber > 30) {
    return rules.minimumPlayerSalary
  }
  return FIRST_ROUND_SCALE[pickNumber - 1] ?? rules.minimumPlayerSalary
}

export function generateRookieContract(
  pickNumber: number,
  pickResultId: string,
  playerId: string,
  teamId: string,
  rules: LeagueRules,
  isTwoWay: boolean,
): RookieContract {
  if (isTwoWay) {
    return {
      id: `rookie-${pickResultId}`,
      playerId,
      teamId,
      yearsTotal: TWO_WAY_YEARS,
      yearsGuaranteed: TWO_WAY_GUARANTEED,
      salaryByYear: Array.from({ length: TWO_WAY_YEARS }, () => TWO_WAY_ANNUAL),
      optionYear: null,
      optionType: 'none',
      draftPickResultId: pickResultId,
      isTwoWay: true,
    }
  }

  const years = rules.rookieDealYears
  const baseSalary = getRookieScaleSalary(pickNumber, rules)
  const salaryByYear: number[] = []
  for (let y = 0; y < years; y++) {
    salaryByYear.push(Math.round(baseSalary * (1 + y * 0.08)))
  }

  const optionYear = years >= 4 ? 4 : years >= 3 ? 3 : null
  const optionType: RookieContract['optionType'] =
    optionYear === 4 ? 'player' : optionYear === 3 ? 'team' : 'none'

  return {
    id: `rookie-${pickResultId}`,
    playerId,
    teamId,
    yearsTotal: years,
    yearsGuaranteed: 2,
    salaryByYear,
    optionYear,
    optionType,
    draftPickResultId: pickResultId,
    isTwoWay: false,
  }
}
