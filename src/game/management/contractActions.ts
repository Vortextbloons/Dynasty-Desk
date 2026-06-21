import type { Contract } from '@/game/models/contract'
import { createContract } from '@/game/models/contract'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { Player } from '@/game/models/player'
import type { Team, LineupSettings } from '@/game/models/team'
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

function removeFromLineup(lineup: LineupSettings, playerId: string): LineupSettings {
  const clean = (ids: string[]) => ids.filter((id) => id !== playerId)
  const { [playerId]: _removedMinutes, ...targetMinutes } = lineup.targetMinutes
  const next: LineupSettings = {
    ...lineup,
    starters: clean(lineup.starters),
    bench: clean(lineup.bench),
    closingLineup: clean(lineup.closingLineup),
    targetMinutes,
  }
  if (lineup.forceInclude) {
    const { [playerId]: _removedForce, ...forceInclude } = lineup.forceInclude
    next.forceInclude = forceInclude
  }
  return next
}

function buildReleasePatch(
  playerId: string,
  team: Team,
  newPayroll: number,
  rules: LeagueRules,
  contract: Contract,
): ContractPatch {
  return {
    players: {
      [playerId]: {
        teamId: null,
        contract,
      },
    },
    teams: {
      [team.id]: {
        roster: team.roster.filter((id) => id !== playerId),
        lineup: removeFromLineup(team.lineup, playerId),
        finances: {
          ...team.finances,
          payroll: newPayroll,
          capSpace: rules.salaryCap - newPayroll,
        },
      },
    },
  }
}

function deadMoneyContract(deadMoney: number, years = 1): Contract {
  return createContract({
    salaryByYear: years === 1 ? [deadMoney] : Array.from({ length: years }, () => deadMoney / years),
    yearsRemaining: years,
    guaranteed: false,
    guaranteedByYear: Array.from({ length: years }, () => false),
  })
}

export function waivePlayer(
  playerId: string,
  player: Player,
  team: Team,
  players: Record<string, Player>,
  rules: LeagueRules,
): ContractActionResult {
  return cutPlayer(playerId, player, team, players, rules)
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

  const guaranteedRemaining = computeGuaranteedRemaining(player.contract)
  const currentCapHit = computeCapHit(player, rules)
  const newPayroll = team.finances.payroll - (currentCapHit - guaranteedRemaining)

  return {
    ok: true,
    patch: buildReleasePatch(
      playerId,
      team,
      newPayroll,
      rules,
      deadMoneyContract(guaranteedRemaining),
    ),
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

  const newContract = createContract({
    salaryByYear: Array.from({ length: stretchedYears }, () => deadPerYear),
    yearsRemaining: stretchedYears,
    guaranteed: false,
    guaranteedByYear: Array.from({ length: stretchedYears }, () => false),
  })

  const currentCapHit = computeCapHit(player, rules)
  const newPayroll = team.finances.payroll - currentCapHit + deadPerYear

  return {
    ok: true,
    patch: buildReleasePatch(playerId, team, newPayroll, rules, newContract),
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

  const guaranteedRemaining = computeGuaranteedRemaining(player.contract)

  if (settleAmount < 0) {
    return { ok: false, reason: 'Settle amount cannot be negative.' }
  }
  if (settleAmount > guaranteedRemaining) {
    return {
      ok: false,
      reason: 'Settle amount cannot exceed guaranteed remaining.',
    }
  }

  const currentCapHit = computeCapHit(player, rules)

  if (settleAmount >= guaranteedRemaining) {
    const newPayroll = team.finances.payroll - currentCapHit
    return {
      ok: true,
      patch: buildReleasePatch(
        playerId,
        team,
        newPayroll,
        rules,
        createContract({
          salaryByYear: [0],
          yearsRemaining: 0,
        }),
      ),
    }
  }

  const capHitPost = Math.max(
    0,
    (guaranteedRemaining - settleAmount) / BUYOUT_SETOFF_DIVISOR,
  )
  const newPayroll = team.finances.payroll - currentCapHit + capHitPost

  return {
    ok: true,
    patch: buildReleasePatch(
      playerId,
      team,
      newPayroll,
      rules,
      deadMoneyContract(capHitPost),
    ),
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

  const newContract = createContract({
    salaryByYear: offer.salaryByYear,
    yearsRemaining: offer.years,
    option: offer.option,
    optionYear: offer.option === 'none' ? null : offer.years,
    noTradeClause: offer.noTradeClause,
    guaranteed: true,
    guaranteedByYear: Array.from({ length: offer.years }, () => true),
    birdRights: player.contract.birdRights,
    earlyBird: player.contract.earlyBird,
  })

  const tempPlayer: Player = { ...player, contract: newContract }
  const newCapHit = computeCapHit(tempPlayer, rules)
  const currentCapHit = computeCapHit(player, rules)

  if (team.finances.payroll - currentCapHit + newCapHit > rules.salaryCap) {
    if (!player.contract.birdRights && !player.contract.earlyBird) {
      return {
        ok: false,
        reason: 'Over the cap without bird rights or early bird rights.',
      }
    }
  }

  const newPayroll = team.finances.payroll - currentCapHit + newCapHit

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

  const newContract = createContract({
    salaryByYear: offer.salaryByYear,
    yearsRemaining: offer.years,
    guaranteed: true,
    guaranteedByYear: Array.from({ length: offer.years }, () => true),
  })

  const tempPlayer: Player = { ...player, contract: newContract }
  const newCapHit = computeCapHit(tempPlayer, rules)

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
