import type { Player } from '@/game/models/player'
import type { DraftPick } from '@/game/models/draft'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { LeagueState } from '@/game/models/league'
import type { Team, TeamFinances } from '@/game/models/team'
import type {
  TradeException,
  TradeProposal,
  TradeSide,
  TradeAsset,
} from '@/game/models/trade'
import { computeApronStatus } from './capEngine'
import { computeFullTaxBill } from './luxuryTaxEngine'
import { recomputeStepienFlags } from './tradeStepien'
import { createRosterChangeEvent } from '@/game/league/newsEngine'

export type ApronStatus = 'below' | 'first' | 'second'

export interface LegalityResult {
  legal: boolean
  reason?: string
  perSideApronStatus: Record<string, ApronStatus>
  perSideRosterSize: Record<string, number>
}

export interface TradeExecutionResult {
  league: LeagueState
  events: string[]
  tradeExceptionsCreated: TradeException[]
  exceptionsConsumed: TradeException[]
  cashPaidOut: Record<string, number>
}

export function validateTradeLegality(
  proposal: TradeProposal,
  league: LeagueState,
  rules: LeagueRules,
): LegalityResult {
  const result: LegalityResult = {
    legal: true,
    perSideApronStatus: {},
    perSideRosterSize: {},
  }

  if (proposal.sides.length < 2 || proposal.sides.length > 4) {
    return { ...result, legal: false, reason: 'Trade must involve 2 to 4 teams.' }
  }
  const teamIds = new Set(proposal.sides.map((s) => s.teamId))
  if (teamIds.size !== proposal.sides.length) {
    return { ...result, legal: false, reason: 'Duplicate team in proposal.' }
  }
  const teamById: Record<string, Team> = {}
  for (const side of proposal.sides) {
    const team = league.teams[side.teamId]
    if (!team) {
      return { ...result, legal: false, reason: `Unknown team: ${side.teamId}` }
    }
    teamById[side.teamId] = team
  }

  const apronEnforced = isApronEnforced(rules)
  const apronStatus: Record<string, ApronStatus> = {}
  for (const side of proposal.sides) {
    const status = apronEnforced
      ? computeApronStatus(teamById[side.teamId]!, rules)
      : 'below'
    apronStatus[side.teamId] = status
    result.perSideApronStatus[side.teamId] = status
  }

  for (const side of proposal.sides) {
    let cash = 0
    for (const asset of side.outgoing) {
      if (asset.type === 'cash') {
        if (!rules.allowCashInTrades) {
          return {
            ...result,
            legal: false,
            reason: `Cash cannot be included in trades this season (disabled in rules).`,
          }
        }
        cash += asset.cashAmount ?? 0
      }
    }
    if (rules.allowCashInTrades && cash > rules.maxCashPerSide) {
      return {
        ...result,
        legal: false,
        reason: `Cash $${(cash / 1_000_000).toFixed(1)}M exceeds limit of $${(rules.maxCashPerSide / 1_000_000).toFixed(1)}M for ${side.teamId}.`,
      }
    }
  }

  for (const side of proposal.sides) {
    for (const asset of side.outgoing) {
      if (asset.type === 'player' && asset.playerId) {
        const player = league.players[asset.playerId]
        if (!player) {
          return { ...result, legal: false, reason: 'Unknown player in proposal.' }
        }
        if (player.contract.noTradeClause) {
          return {
            ...result,
            legal: false,
            reason: `${player.firstName} ${player.lastName} has a no-trade clause.`,
          }
        }
        if (player.teamId !== side.teamId) {
          return {
            ...result,
            legal: false,
            reason: `${player.firstName} ${player.lastName} is not on ${side.teamId}.`,
          }
        }
      }
      if (asset.type === 'pick' && asset.pickId) {
        const pick = league.draftPicks.find((p) => p.id === asset.pickId)
        if (!pick) {
          return { ...result, legal: false, reason: 'Unknown pick in proposal.' }
        }
        if (pick.currentTeamId !== side.teamId) {
          return {
            ...result,
            legal: false,
            reason: `Pick ${pick.id} is not owned by ${side.teamId}.`,
          }
        }
        if (pick.stepienBlocked) {
          return {
            ...result,
            legal: false,
            reason: `Pick ${pick.id} is Stepien-blocked (would create a two-year gap).`,
          }
        }
        if (apronEnforced) {
          const status = apronStatus[side.teamId]!
          if (status === 'second' && pick.round === 1) {
            if (isFrozenByApron(pick)) {
              return {
                ...result,
                legal: false,
                reason: `First-round pick ${pick.id} is frozen by 2nd apron rule.`,
              }
            }
            const yearsOut = yearsUntilSeason(pick.season, league.rules.seasonLabel)
            if (yearsOut > rules.pickFreezeYears) {
              return {
                ...result,
                legal: false,
                reason: `2nd-apron team cannot trade 1st-round pick ${rules.pickFreezeYears}+ years out (${pick.season}).`,
              }
            }
          }
        }
      }
      if (asset.type === 'exception' && asset.exceptionId) {
        const ex = teamById[side.teamId]?.tradeExceptions?.find(
          (te) => te.id === asset.exceptionId,
        )
        if (!ex) {
          return {
            ...result,
            legal: false,
            reason: `Trade exception ${asset.exceptionId} not found on ${side.teamId}.`,
          }
        }
        if (new Date(ex.expiresAt) < new Date(league.currentDate)) {
          return {
            ...result,
            legal: false,
            reason: `Trade exception ${asset.exceptionId} has expired.`,
          }
        }
        if (asset.toTeamId && asset.toTeamId !== side.teamId) {
          return {
            ...result,
            legal: false,
            reason: `Trade exception cannot be sent to another team.`,
          }
        }
      }
    }
  }

  for (const side of proposal.sides) {
    for (const asset of side.incoming) {
      if (asset.type === 'exception' && asset.exceptionId) {
        const ex = teamById[side.teamId]?.tradeExceptions?.find(
          (te) => te.id === asset.exceptionId,
        )
        if (!ex) {
          return {
            ...result,
            legal: false,
            reason: `Trade exception ${asset.exceptionId} not found on ${side.teamId}.`,
          }
        }
        if (new Date(ex.expiresAt) < new Date(league.currentDate)) {
          return {
            ...result,
            legal: false,
            reason: `Trade exception ${asset.exceptionId} has expired.`,
          }
        }
        if (asset.toTeamId && asset.toTeamId !== side.teamId) {
          return {
            ...result,
            legal: false,
            reason: `Trade exception cannot be sent to another team.`,
          }
        }
      }
    }
  }

  for (const side of proposal.sides) {
    const team = teamById[side.teamId]!
    const finalRosterSize = computeFinalRosterSize(team, side, league)
    result.perSideRosterSize[side.teamId] = finalRosterSize
    if (finalRosterSize < rules.minRosterSize || finalRosterSize > rules.maxRosterSize) {
      return {
        ...result,
        legal: false,
        reason: `${side.teamId} roster would be ${finalRosterSize} (must be ${rules.minRosterSize}-${rules.maxRosterSize}).`,
      }
    }
  }

  if (apronEnforced) {
    for (const side of proposal.sides) {
      const playerOutgoing = sumSalary(side.outgoing, league, rules)
      const playerIncoming = sumSalary(side.incoming, league, rules)
      const teamRecord = teamById[side.teamId]!
      const tpeAmount = side.incoming
        .filter((a) => a.type === 'exception' && a.exceptionId)
        .reduce((sum, a) => {
          const ex = teamRecord.tradeExceptions?.find(
            (te) => te.id === a.exceptionId,
          )
          if (!ex) return sum
          if (new Date(ex.expiresAt) < new Date(league.currentDate)) return sum
          return sum + ex.amount
        }, 0)
      const outgoing = playerOutgoing + tpeAmount
      const incoming = playerIncoming
      const teamApron = apronStatus[side.teamId]!
      if (!checkSalaryMatch(outgoing, incoming, teamApron)) {
        return {
          ...result,
          legal: false,
          reason: `Salary match failed for ${side.teamId} (out $${(outgoing / 1_000_000).toFixed(1)}M, in $${(incoming / 1_000_000).toFixed(1)}M, ${teamApron} apron).`,
        }
      }
    }
  }

  if (apronEnforced) {
    for (const side of proposal.sides) {
      const teamApron = apronStatus[side.teamId]!
      if (teamApron === 'second') {
        for (const asset of side.incoming) {
          if (asset.type === 'player' && asset.playerId) {
            const recentSeason = league.recentlyTraded?.[asset.playerId]
            if (recentSeason) {
              const tradedYear = parseSeasonStartYear(recentSeason)
              const currentYear = parseSeasonStartYear(league.rules.seasonLabel)
              if (currentYear - tradedYear <= 1) {
                return {
                  ...result,
                  legal: false,
                  reason: `2nd-apron team cannot reacquire a player traded within the last season.`,
                }
              }
            }
          }
        }
      }
    }
  }

  return result
}

function isApronEnforced(rules: LeagueRules): boolean {
  return rules.apron > 0 && rules.secondApron > 0 && rules.luxuryTaxLine > 0
}

function isFrozenByApron(pick: DraftPick): boolean {
  return Boolean(pick.frozenUntilSeason)
}

function yearsUntilSeason(targetSeason: string, currentSeason: string): number {
  const target = parseSeasonStartYear(targetSeason)
  const current = parseSeasonStartYear(currentSeason)
  return target - current
}

function parseSeasonStartYear(season: string): number {
  const m = /^(\d{4})/.exec(season)
  return m ? Number(m[1]) : 0
}

function computeFinalRosterSize(
  team: Team,
  side: TradeSide,
  league: LeagueState,
): number {
  const outPlayerIds = new Set(
    side.outgoing
      .filter((a) => a.type === 'player' && a.playerId)
      .map((a) => a.playerId!),
  )
  const inPlayerIds = side.incoming
    .filter((a) => a.type === 'player' && a.playerId)
    .map((a) => a.playerId!)
    .filter((pid) => {
      const p = league.players[pid]
      return p && p.teamId !== team.id
    })

  return (
    team.roster.filter((id) => !outPlayerIds.has(id)).length + inPlayerIds.length
  )
}

function sumSalary(
  assets: TradeAsset[],
  league: LeagueState,
  rules: LeagueRules,
): number {
  let total = 0
  for (const asset of assets) {
    if (asset.type === 'player' && asset.playerId) {
      const player = league.players[asset.playerId]
      if (player) {
        total += computeCapHitForPlayer(player, rules)
      }
    }
  }
  return total
}

function computeCapHitForPlayer(player: Player, _rules: LeagueRules): number {
  const salary = player.contract.salaryByYear[0] ?? 0
  const signingBonus = player.contract.signingBonusByYear[0] ?? 0
  const likelyBonus = player.contract.likelyBonusesByYear[0] ?? 0
  const base = salary + signingBonus + likelyBonus
  if (player.contract.baseYearCompensation) {
    return base * 0.5
  }
  return base
}

function checkSalaryMatch(
  outgoing: number,
  incoming: number,
  apronStatus: ApronStatus,
): boolean {
  if (apronStatus === 'second') {
    return incoming <= outgoing
  }
  if (apronStatus === 'first') {
    return incoming <= outgoing * 1.1
  }
  if (outgoing <= 7_500_000) {
    return incoming <= outgoing * 1.75 + 7_500_000
  }
  if (outgoing <= 29_000_000) {
    return incoming <= outgoing + 7_500_000
  }
  return incoming <= outgoing * 1.25
}

export function executeTrade(
  proposal: TradeProposal,
  league: LeagueState,
  rules: LeagueRules,
): TradeExecutionResult {
  const legality = validateTradeLegality(proposal, league, rules)
  if (!legality.legal) {
    throw new Error(`Trade is illegal: ${legality.reason}`)
  }

  const newLeague: LeagueState = {
    ...league,
    teams: { ...league.teams },
    players: { ...league.players },
    draftPicks: league.draftPicks.map((p) => ({ ...p })),
    transactions: [...league.transactions],
    news: [...league.news],
  }

  const playerMoves: { player: Player; toTeamId: string }[] = []
  for (const side of proposal.sides) {
    for (const asset of side.outgoing) {
      if (asset.type === 'player' && asset.playerId) {
        const player = newLeague.players[asset.playerId]
        if (!player) continue
        const toTeamId = resolveAssetTarget(asset, side.teamId, proposal)
        if (toTeamId) playerMoves.push({ player, toTeamId })
      }
    }
  }

  for (const move of playerMoves) {
    const player = move.player
    const fromTeamId = player.teamId
    player.teamId = move.toTeamId
    if (fromTeamId) {
      const fromTeam = newLeague.teams[fromTeamId]
      if (fromTeam) {
        fromTeam.roster = fromTeam.roster.filter((id) => id !== player.id)
      }
    }
    const toTeam = newLeague.teams[move.toTeamId]
    if (toTeam && !toTeam.roster.includes(player.id)) {
      toTeam.roster = [...toTeam.roster, player.id]
    }
  }

  newLeague.recentlyTraded ??= {}
  for (const move of playerMoves) {
    newLeague.recentlyTraded[move.player.id] = league.rules.seasonLabel
    const fromTeam = move.player.teamId ? newLeague.teams[move.player.teamId] : null
    const toTeam = newLeague.teams[move.toTeamId]
    const fromName = fromTeam ? `${fromTeam.city} ${fromTeam.name}` : null
    const toName = toTeam ? `${toTeam.city} ${toTeam.name}` : null
    const playerName = `${move.player.firstName} ${move.player.lastName}`
    newLeague.news.push(
      createRosterChangeEvent(move.player.id, playerName, fromName, toName, 'was traded', newLeague.currentDate),
    )
  }

  for (const side of proposal.sides) {
    for (const asset of side.outgoing) {
      if (asset.type === 'pick' && asset.pickId) {
        const pick = newLeague.draftPicks.find((p) => p.id === asset.pickId)
        if (!pick) continue
        const toTeamId = resolveAssetTarget(asset, side.teamId, proposal)
        if (toTeamId) pick.currentTeamId = toTeamId
      }
    }
  }

  const events: string[] = []
  const exceptionsCreated: TradeException[] = []
  const exceptionsConsumed: TradeException[] = []
  const cashPaidOut: Record<string, number> = {}

  for (const side of proposal.sides) {
    const team = newLeague.teams[side.teamId]!
    const outgoingSalary = sumSalary(side.outgoing, newLeague, rules)
    const incomingSalary = sumSalary(side.incoming, newLeague, rules)
    const cashOut = side.outgoing
      .filter((a) => a.type === 'cash')
      .reduce((sum, a) => sum + (a.cashAmount ?? 0), 0)
    const cashIn = side.incoming
      .filter((a) => a.type === 'cash')
      .reduce((sum, a) => sum + (a.cashAmount ?? 0), 0)
    cashPaidOut[side.teamId] = (cashPaidOut[side.teamId] ?? 0) + cashOut - cashIn

    const exceptionIn = side.incoming.filter(
      (a) => a.type === 'exception' && a.exceptionId,
    )
    const newPayroll = team.finances.payroll - outgoingSalary + incomingSalary

    let consumedAmount = 0
    for (const exAsset of exceptionIn) {
      const ex = team.tradeExceptions?.find((e) => e.id === exAsset.exceptionId)
      if (ex) {
        consumedAmount += ex.amount
        team.tradeExceptions = (team.tradeExceptions ?? []).filter(
          (e) => e.id !== ex.id,
        )
        exceptionsConsumed.push(ex)
      }
    }

    const netWithoutException = outgoingSalary - (incomingSalary + consumedAmount)
    if (netWithoutException > 0 && rules.tradeExceptionYears > 0) {
      const expiresAt = addYearsISO(newLeague.currentDate, rules.tradeExceptionYears)
      const exception: TradeException = {
        id: crypto.randomUUID(),
        teamId: side.teamId,
        amount: netWithoutException,
        expiresAt,
        source: 'outgoing_salary',
      }
      exceptionsCreated.push(exception)
      team.tradeExceptions = [...(team.tradeExceptions ?? []), exception]
    }

    team.finances = applyFinancials(team.finances, newPayroll, rules, team.priorTaxpayerYears ?? 0)

    if (newPayroll >= rules.secondApron && rules.secondApron > 0) {
      freeze1stRoundPicks(
        team,
        newLeague,
        rules.pickFreezeYears,
        newLeague.rules.seasonLabel,
      )
    }

    if (team.finances.payroll >= rules.luxuryTaxLine) {
      team.priorTaxpayerYears = (team.priorTaxpayerYears ?? 0) + 1
    } else {
      team.priorTaxpayerYears = 0
    }

    events.push(`${side.teamId} completed trade side`)
  }

  recomputeStepienFlags(newLeague)

  newLeague.transactions = [
    ...newLeague.transactions,
    {
      id: crypto.randomUUID(),
      date: newLeague.currentDate,
      type: 'trade',
      teamIds: proposal.sides.map((s) => s.teamId),
      playerIds: playerMoves.map((m) => m.player.id),
      pickIds: proposal.sides.flatMap((s) =>
        s.outgoing.filter((a) => a.type === 'pick').map((a) => a.pickId!).filter(Boolean),
      ),
      description: buildTradeDescription(proposal, newLeague),
    },
  ]

  return {
    league: newLeague,
    events,
    tradeExceptionsCreated: exceptionsCreated,
    exceptionsConsumed,
    cashPaidOut,
  }
}

function applyFinancials(
  finances: TeamFinances,
  newPayroll: number,
  rules: LeagueRules,
  priorTaxpayerYears: number,
): TeamFinances {
  const bill = computeFullTaxBill(
    { finances: { ...finances, payroll: newPayroll } } as Team,
    rules,
    priorTaxpayerYears,
    new Date().getFullYear(),
  )
  return {
    ...finances,
    payroll: newPayroll,
    capSpace: rules.salaryCap - newPayroll,
    taxBill: bill.totalTaxBill,
    projectedTaxBill: bill.totalTaxBill,
  }
}

function resolveAssetTarget(
  asset: TradeAsset,
  fromTeamId: string,
  proposal: TradeProposal,
): string | null {
  if (asset.toTeamId && asset.toTeamId !== fromTeamId) {
    if (proposal.sides.some((s) => s.teamId === asset.toTeamId)) {
      return asset.toTeamId
    }
  }
  const otherSides = proposal.sides.filter((s) => s.teamId !== fromTeamId)
  if (otherSides.length === 1) return otherSides[0]!.teamId
  return null
}

function addYearsISO(iso: string, years: number): string {
  const d = new Date(iso)
  d.setUTCFullYear(d.getUTCFullYear() + years)
  return d.toISOString()
}

function freeze1stRoundPicks(
  team: Team,
  league: LeagueState,
  years: number,
  currentSeason: string,
): void {
  const currentYear = parseSeasonStartYear(currentSeason)
  const targetYear = currentYear + years
  const targetSeason = formatSeasonLabel(targetYear)

  const pickIds: string[] = []
  for (const pick of league.draftPicks) {
    if (pick.originalTeamId !== team.id) continue
    if (pick.round !== 1) continue
    if (pick.frozenUntilSeason) continue
    pick.frozenUntilSeason = targetSeason
    pickIds.push(pick.id)
  }
  if (pickIds.length > 0) {
    team.frozenPicks = Array.from(new Set([...(team.frozenPicks ?? []), ...pickIds]))
  }
}

function formatSeasonLabel(startYear: number): string {
  const endYear = (startYear + 1) % 100
  return `${startYear}-${String(endYear).padStart(2, '0')}`
}

function buildTradeDescription(
  proposal: TradeProposal,
  league: LeagueState,
): string {
  const parts: string[] = []
  for (const side of proposal.sides) {
    const teamName = league.teams[side.teamId]?.name ?? side.teamId
    const out = side.outgoing
      .map((a) => describeAsset(a, league))
      .join(', ')
    parts.push(`${teamName} sends: ${out || '—'}`)
  }
  return parts.join(' | ')
}

function describeAsset(asset: TradeAsset, league: LeagueState): string {
  if (asset.type === 'player' && asset.playerId) {
    const p = league.players[asset.playerId]
    return p ? `${p.firstName} ${p.lastName}` : 'player'
  }
  if (asset.type === 'pick' && asset.pickId) {
    const p = league.draftPicks.find((pp) => pp.id === asset.pickId)
    if (!p) return 'pick'
    const protectedTag = p.protected ? ` (top-${p.protected} protected)` : ''
    return `${p.season} Rd${p.round} #${p.pickNumber}${protectedTag}`
  }
  if (asset.type === 'cash') {
    return `$${((asset.cashAmount ?? 0) / 1_000_000).toFixed(1)}M cash`
  }
  if (asset.type === 'exception') {
    return 'TPE'
  }
  return 'asset'
}
