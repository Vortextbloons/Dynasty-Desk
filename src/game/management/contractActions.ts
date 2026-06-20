import type { Contract } from '@/game/models/contract'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { Player } from '@/game/models/player'
import type { Team } from '@/game/models/team'
import type { TeamExceptionBook } from '@/game/models/team'
import {
  STRETCH_MULTIPLIER,
  BUYOUT_SETOFF_DIVISOR,
  MAX_EXTENSION_RAISE_PCT,
} from './financeConstants'
import { computeCapHit } from './capEngine'

export type ExceptionType = 'minimum' | 'mle' | 'bae' | 'room_mle'

export interface ExtensionOffer {
  years: number
  salaryByYear: number[]
  option: 'team' | 'player' | 'none'
  noTradeClause: boolean
}

export interface FreeAgentOffer {
  years: number
  salaryByYear: number[]
}

export type ContractActionResult =
  | { ok: true; patch: ContractPatch }
  | { ok: false; reason: string }

export interface ContractPatch {
  players: Record<string, Partial<Player>>
  teams: Record<string, Partial<Team>>
}

export function cutPlayer(
  playerId: string,
  player: Player,
  team: Team,
  _players: Record<string, Player>,
  rules: LeagueRules,
): ContractActionResult {
  if (player.teamId !== team.id) {
    return { ok: false, reason: 'Player is not on this team.' }
  }

  const c = player.contract
  const guaranteedRemaining = computeGuaranteedRemaining(c)
  const currentCapHit = computeCapHit(player, rules)

  const deadMoney = guaranteedRemaining
  const freed = currentCapHit - deadMoney

  const newContract: Contract = {
    salaryByYear: [deadMoney],
    yearsRemaining: 1,
    option: 'none',
    optionYear: null,
    noTradeClause: false,
    signingBonusByYear: [0],
    likelyBonusesByYear: [0],
    unlikelyBonusesByYear: [0],
    guaranteed: false,
    guaranteedByYear: [false],
    tradeKickers: [],
    poisonPill: false,
    birdRights: false,
    earlyBird: false,
    baseYearCompensation: false,
    deferredMoney: [],
  }

  const newPayroll = team.finances.payroll - freed

  return {
    ok: true,
    patch: {
      players: {
        [playerId]: {
          teamId: null,
          contract: newContract,
        },
      },
      teams: {
        [team.id]: {
          roster: team.roster.filter((id) => id !== playerId),
          finances: {
            ...team.finances,
            payroll: newPayroll,
            capSpace: rules.salaryCap - newPayroll,
          },
        },
      },
    },
  }
}

export function stretchContract(
  playerId: string,
  player: Player,
  team: Team,
  rules: LeagueRules,
): ContractActionResult {
  if (player.teamId !== team.id) {
    return { ok: false, reason: 'Player is not on this team.' }
  }

  const c = player.contract
  const guaranteedRemaining = computeGuaranteedRemaining(c)
  const stretchedYears = c.yearsRemaining * STRETCH_MULTIPLIER
  const deadPerYear = guaranteedRemaining / stretchedYears

  const newSalaryByYear = Array.from(
    { length: stretchedYears },
    () => deadPerYear,
  )
  const newGuaranteedByYear = Array.from(
    { length: stretchedYears },
    () => false,
  )

  const newContract: Contract = {
    salaryByYear: newSalaryByYear,
    yearsRemaining: stretchedYears,
    option: 'none',
    optionYear: null,
    noTradeClause: false,
    signingBonusByYear: Array.from({ length: stretchedYears }, () => 0),
    likelyBonusesByYear: Array.from({ length: stretchedYears }, () => 0),
    unlikelyBonusesByYear: Array.from({ length: stretchedYears }, () => 0),
    guaranteed: false,
    guaranteedByYear: newGuaranteedByYear,
    tradeKickers: [],
    poisonPill: false,
    birdRights: false,
    earlyBird: false,
    baseYearCompensation: false,
    deferredMoney: [],
  }

  const currentCapHit = computeCapHit(player, rules)
  const newPayroll = team.finances.payroll - currentCapHit + deadPerYear

  return {
    ok: true,
    patch: {
      players: {
        [playerId]: {
          teamId: null,
          contract: newContract,
        },
      },
      teams: {
        [team.id]: {
          roster: team.roster.filter((id) => id !== playerId),
          finances: {
            ...team.finances,
            payroll: newPayroll,
            capSpace: rules.salaryCap - newPayroll,
          },
        },
      },
    },
  }
}

export function buyoutPlayer(
  playerId: string,
  player: Player,
  settleAmount: number,
  team: Team,
  rules: LeagueRules,
): ContractActionResult {
  if (player.teamId !== team.id) {
    return { ok: false, reason: 'Player is not on this team.' }
  }

  const c = player.contract
  const guaranteedRemaining = computeGuaranteedRemaining(c)

  if (settleAmount < 0) {
    return { ok: false, reason: 'Settle amount cannot be negative.' }
  }
  if (settleAmount > guaranteedRemaining) {
    return {
      ok: false,
      reason: 'Settle amount cannot exceed guaranteed remaining.',
    }
  }

  if (settleAmount >= guaranteedRemaining) {
    const currentCapHit = computeCapHit(player, rules)
    const newPayroll = team.finances.payroll - currentCapHit

    return {
      ok: true,
      patch: {
        players: {
          [playerId]: {
            teamId: null,
            contract: {
              salaryByYear: [0],
              yearsRemaining: 0,
              option: 'none',
              optionYear: null,
              noTradeClause: false,
              signingBonusByYear: [0],
              likelyBonusesByYear: [0],
              unlikelyBonusesByYear: [0],
              guaranteed: false,
              guaranteedByYear: [false],
              tradeKickers: [],
              poisonPill: false,
              birdRights: false,
              earlyBird: false,
              baseYearCompensation: false,
              deferredMoney: [],
            },
          },
        },
        teams: {
          [team.id]: {
            roster: team.roster.filter((id) => id !== playerId),
            finances: {
              ...team.finances,
              payroll: newPayroll,
              capSpace: rules.salaryCap - newPayroll,
            },
          },
        },
      },
    }
  }

  const capHitPost = Math.max(
    0,
    (guaranteedRemaining - settleAmount) / BUYOUT_SETOFF_DIVISOR,
  )

  const newContract: Contract = {
    salaryByYear: [capHitPost],
    yearsRemaining: 1,
    option: 'none',
    optionYear: null,
    noTradeClause: false,
    signingBonusByYear: [0],
    likelyBonusesByYear: [0],
    unlikelyBonusesByYear: [0],
    guaranteed: false,
    guaranteedByYear: [false],
    tradeKickers: [],
    poisonPill: false,
    birdRights: false,
    earlyBird: false,
    baseYearCompensation: false,
    deferredMoney: [],
  }

  const currentCapHit = computeCapHit(player, rules)
  const newPayroll = team.finances.payroll - currentCapHit + capHitPost

  return {
    ok: true,
    patch: {
      players: {
        [playerId]: {
          teamId: null,
          contract: newContract,
        },
      },
      teams: {
        [team.id]: {
          roster: team.roster.filter((id) => id !== playerId),
          finances: {
            ...team.finances,
            payroll: newPayroll,
            capSpace: rules.salaryCap - newPayroll,
          },
        },
      },
    },
  }
}

export function extendPlayer(
  playerId: string,
  player: Player,
  offer: ExtensionOffer,
  team: Team,
  _players: Record<string, Player>,
  rules: LeagueRules,
): ContractActionResult {
  if (player.teamId !== team.id) {
    return { ok: false, reason: 'Player is not on this team.' }
  }
  if (offer.years > rules.maxContractYears) {
    return {
      ok: false,
      reason: `Maximum contract length is ${rules.maxContractYears} years.`,
    }
  }
  if (offer.years !== offer.salaryByYear.length) {
    return {
      ok: false,
      reason: 'Years must match salary array length.',
    }
  }

  const firstYearSalary = offer.salaryByYear[0] ?? 0
  for (let i = 1; i < offer.salaryByYear.length; i++) {
    const salary = offer.salaryByYear[i]!
    const maxAllowed = firstYearSalary * (1 + MAX_EXTENSION_RAISE_PCT * i)
    if (salary > maxAllowed) {
      return {
        ok: false,
        reason: `Year ${i + 1} salary exceeds ${MAX_EXTENSION_RAISE_PCT * 100}% annual raise limit.`,
      }
    }
  }

  const newCapHit = offer.salaryByYear.reduce((sum, s) => sum + s, 0) / offer.years
  const currentPayroll = team.finances.payroll
  const currentCapHit = computeCapHit(player, rules)

  if (currentPayroll - currentCapHit + newCapHit > rules.salaryCap) {
    if (!player.contract.birdRights && !player.contract.earlyBird) {
      return {
        ok: false,
        reason: 'Over the cap without bird rights or early bird rights.',
      }
    }
  }

  const newContract: Contract = {
    salaryByYear: offer.salaryByYear,
    yearsRemaining: offer.years,
    option: offer.option,
    optionYear: offer.option === 'none' ? null : offer.years,
    noTradeClause: offer.noTradeClause,
    signingBonusByYear: Array.from({ length: offer.years }, () => 0),
    likelyBonusesByYear: Array.from({ length: offer.years }, () => 0),
    unlikelyBonusesByYear: Array.from({ length: offer.years }, () => 0),
    guaranteed: true,
    guaranteedByYear: Array.from({ length: offer.years }, () => true),
    tradeKickers: [],
    poisonPill: false,
    birdRights: player.contract.birdRights,
    earlyBird: player.contract.earlyBird,
    baseYearCompensation: false,
    deferredMoney: [],
  }

  const newPayroll = currentPayroll - currentCapHit + newCapHit

  return {
    ok: true,
    patch: {
      players: {
        [playerId]: { contract: newContract },
      },
      teams: {
        [team.id]: {
          finances: {
            ...team.finances,
            payroll: newPayroll,
            capSpace: rules.salaryCap - newPayroll,
          },
        },
      },
    },
  }
}

export function signFreeAgent(
  playerId: string,
  player: Player,
  offer: FreeAgentOffer,
  exception: ExceptionType,
  team: Team,
  rules: LeagueRules,
  exceptionsUsed: TeamExceptionBook,
): ContractActionResult {
  if (player.teamId !== null) {
    return { ok: false, reason: 'Player is not a free agent.' }
  }
  if (offer.years !== offer.salaryByYear.length) {
    return {
      ok: false,
      reason: 'Years must match salary array length.',
    }
  }
  if (offer.years > rules.maxContractYears) {
    return {
      ok: false,
      reason: `Maximum contract length is ${rules.maxContractYears} years.`,
    }
  }

  const newCapHit =
    offer.salaryByYear.reduce((sum, s) => sum + s, 0) / offer.years

  switch (exception) {
    case 'minimum':
      break
    case 'mle':
      if (exceptionsUsed.mle) {
        return { ok: false, reason: 'MLE already used this offseason.' }
      }
      if (newCapHit > rules.midLevelException) {
        return {
          ok: false,
          reason: `Cap hit exceeds MLE of $${(rules.midLevelException / 1_000_000).toFixed(1)}M.`,
        }
      }
      break
    case 'bae':
      if (exceptionsUsed.bae) {
        return { ok: false, reason: 'BAE already used this offseason.' }
      }
      if (newCapHit > rules.biAnnualException) {
        return {
          ok: false,
          reason: `Cap hit exceeds BAE of $${(rules.biAnnualException / 1_000_000).toFixed(1)}M.`,
        }
      }
      break
    case 'room_mle':
      if (exceptionsUsed.roomMle) {
        return {
          ok: false,
          reason: 'Room MLE already used this offseason.',
        }
      }
      if (team.finances.payroll >= rules.salaryCap) {
        return {
          ok: false,
          reason: 'Room MLE requires cap space.',
        }
      }
      if (newCapHit > rules.roomMle) {
        return {
          ok: false,
          reason: `Cap hit exceeds Room MLE of $${(rules.roomMle / 1_000_000).toFixed(1)}M.`,
        }
      }
      break
  }

  const newContract: Contract = {
    salaryByYear: offer.salaryByYear,
    yearsRemaining: offer.years,
    option: 'none',
    optionYear: null,
    noTradeClause: false,
    signingBonusByYear: Array.from({ length: offer.years }, () => 0),
    likelyBonusesByYear: Array.from({ length: offer.years }, () => 0),
    unlikelyBonusesByYear: Array.from({ length: offer.years }, () => 0),
    guaranteed: true,
    guaranteedByYear: Array.from({ length: offer.years }, () => true),
    tradeKickers: [],
    poisonPill: false,
    birdRights: false,
    earlyBird: false,
    baseYearCompensation: false,
    deferredMoney: [],
  }

  const newPayroll = team.finances.payroll + newCapHit
  const newExceptionsUsed = { ...exceptionsUsed }

  if (exception === 'mle') newExceptionsUsed.mle = true
  if (exception === 'bae') newExceptionsUsed.bae = true
  if (exception === 'room_mle') newExceptionsUsed.roomMle = true
  if (exception === 'minimum') newExceptionsUsed.minimumCount += 1

  return {
    ok: true,
    patch: {
      players: {
        [playerId]: {
          teamId: team.id,
          contract: newContract,
        },
      },
      teams: {
        [team.id]: {
          roster: [...team.roster, playerId],
          finances: {
            ...team.finances,
            payroll: newPayroll,
            capSpace: rules.salaryCap - newPayroll,
            exceptionsUsed: newExceptionsUsed,
          },
        },
      },
    },
  }
}

function computeGuaranteedRemaining(contract: Contract): number {
  let total = 0
  for (let i = 0; i < contract.yearsRemaining; i++) {
    if (contract.guaranteedByYear[i] ?? contract.guaranteed) {
      total += contract.salaryByYear[i] ?? 0
    }
  }
  return total
}
