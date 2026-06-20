import type { Contract } from '../src/game/models/contract'
import type { StaticPlayer } from '../src/game/models/static'
import type { LeagueRules } from '../src/game/models/leagueRules'
import { getBaseSalary, getContractYears, ANNUAL_RAISE_PCT } from '../src/game/ratings/contractTierTable'

function computeOverallRating(player: StaticPlayer): number {
  const r = player.ratings
  const ratings = [
    r.insideScoring, r.closeShot, r.midrange, r.threePoint,
    r.freeThrow, r.ballHandling, r.passing, r.offensiveIq,
    r.offensiveRebound, r.defensiveRebound, r.perimeterDefense,
    r.interiorDefense, r.steal, r.block, r.defensiveIq,
    r.speed, r.strength, r.vertical, r.stamina, r.durability,
    r.clutch, r.consistency, r.potential,
  ]
  return Math.round(ratings.reduce((sum, v) => sum + v, 0) / ratings.length)
}

export function deriveContract(
  player: StaticPlayer,
  _rules: LeagueRules,
  _snapshotSeason: string,
): Contract {
  const overall = computeOverallRating(player)
  const baseSalary = getBaseSalary(overall)
  const yearsInLeague = Math.max(1, player.age - 18)
  const years = getContractYears(yearsInLeague)

  const salaryByYear: number[] = []
  for (let i = 0; i < years; i++) {
    salaryByYear.push(Math.round(baseSalary * Math.pow(1 + ANNUAL_RAISE_PCT, i)))
  }

  const guaranteed = years <= 3
  const guaranteedByYear = Array.from({ length: years }, (_, i) => {
    if (years <= 3) return true
    return i < years - 1
  })

  const signingBonusPerYear = Math.round((baseSalary * 0.05) / years)
  const signingBonusByYear = Array.from({ length: years }, () => signingBonusPerYear)

  const option = years >= 4 ? 'player' as const : 'none' as const
  const optionYear = years >= 4 ? years : null

  const birdRights = yearsInLeague >= 7
  const earlyBird = yearsInLeague >= 4

  return {
    salaryByYear,
    yearsRemaining: years,
    option,
    optionYear,
    noTradeClause: false,

    signingBonusByYear,
    likelyBonusesByYear: Array.from({ length: years }, () => 0),
    unlikelyBonusesByYear: Array.from({ length: years }, () => 0),

    guaranteed,
    guaranteedByYear,

    tradeKickers: [],
    poisonPill: false,

    birdRights,
    earlyBird,
    baseYearCompensation: false,

    deferredMoney: [],
  }
}
