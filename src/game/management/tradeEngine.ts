import type { Player } from '@/game/models/player'
import type { DraftPick } from '@/game/models/draft'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { LeagueState } from '@/game/models/league'
import type { Team } from '@/game/models/team'
import type { TradeException, TradeProposal, TradeSide } from '@/game/models/trade'
import { computeCapHit } from './capEngine'

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

  const apronStatus: Record<string, ApronStatus> = {}
  for (const side of proposal.sides) {
    const team = league.teams[side.teamId]
    if (!team) {
      return { ...result, legal: false, reason: `Unknown team: ${side.teamId}` }
    }
    const status = computeApronStatus(team, rules)
    apronStatus[side.teamId] = status
    result.perSideApronStatus[side.teamId] = status
  }

  const cashTotals: Record<string, number> = {}
  for (const side of proposal.sides) {
    let cash = 0
    for (const asset of side.outgoing) {
      if (asset.type === 'cash') {
        cash += asset.cashAmount ?? 0
      }
    }
    cashTotals[side.teamId] = cash
    if (rules.allowCashInTrades && cash > rules.maxCashPerSide) {
      return {
        ...result,
        legal: false,
        reason: `Cash exceeds $${(rules.maxCashPerSide / 1_000_000).toFixed(1)}M limit for ${side.teamId}.`,
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
        const teamStatus = apronStatus[side.teamId]
        if (
          teamStatus === 'second' &&
          pick.round === 1 &&
          pick.frozenUntilSeason
        ) {
          const currentYear = league.rules.seasonLabel
          if (isPickFrozenByApron(pick, currentYear, rules.pickFreezeYears)) {
            return {
              ...result,
              legal: false,
              reason: `First-round pick ${pick.id} is frozen by 2nd apron (${rules.pickFreezeYears} years out).`,
            }
          }
        }
        if (teamStatus === 'second' && pick.round === 1) {
          return {
            ...result,
            legal: false,
            reason: '2nd-apron teams cannot trade 1st-round picks more than pickFreezeYears out.',
          }
        }
      }
    }
  }

  for (const side of proposal.sides) {
    const team = league.teams[side.teamId]!
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

  const pairs = generatePairs(proposal.sides)
  for (const [aId, bId] of pairs) {
    const aSide = proposal.sides.find((s) => s.teamId === aId)!
    const bSide = proposal.sides.find((s) => s.teamId === bId)!

    const outgoingA = sumOutgoingSalary(aSide, league, rules)
    const incomingA = sumIncomingSalary(bSide.outgoing, league, rules)
    const outgoingB = sumOutgoingSalary(bSide, league, rules)
    const incomingB = sumIncomingSalary(aSide.outgoing, league, rules)

    if (!checkSalaryMatch(outgoingA, incomingA, rules, apronStatus[aId]!)) {
      return {
        ...result,
        legal: false,
        reason: `Salary matching failed for ${aId} (incoming $${(incomingA / 1_000_000).toFixed(1)}M vs outgoing $${(outgoingA / 1_000_000).toFixed(1)}M).`,
      }
    }
    if (!checkSalaryMatch(outgoingB, incomingB, rules, apronStatus[bId]!)) {
      return {
        ...result,
        legal: false,
        reason: `Salary matching failed for ${bId} (incoming $${(incomingB / 1_000_000).toFixed(1)}M vs outgoing $${(outgoingB / 1_000_000).toFixed(1)}M).`,
      }
    }
  }

  return result
}

function isPickFrozenByApron(
  pick: DraftPick,
  _currentSeason: string,
  _years: number,
): boolean {
  return Boolean(pick.frozenUntilSeason)
}

function generatePairs(sides: TradeSide[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < sides.length; i++) {
    for (let j = i + 1; j < sides.length; j++) {
      pairs.push([sides[i]!.teamId, sides[j]!.teamId])
    }
  }
  return pairs
}

function computeApronStatus(team: Team, rules: LeagueRules): ApronStatus {
  if (team.finances.payroll >= rules.secondApron) return 'second'
  if (team.finances.payroll >= rules.apron) return 'first'
  return 'below'
}

function computeFinalRosterSize(
  team: Team,
  side: TradeSide,
  league: LeagueState,
): number {
  const outPlayerIds = new Set(
    side.outgoing
      .filter((a) => a.type === 'player' && a.playerId)
      .map((a) => a.playerId as string),
  )
  const inPlayerIds = side.incoming
    .filter((a) => a.type === 'player' && a.playerId)
    .map((a) => a.playerId as string)
    .filter((pid) => {
      const p = league.players[pid]
      return p && p.teamId !== team.id
    })

  return team.roster.filter((id) => !outPlayerIds.has(id)).length + inPlayerIds.length
}

function sumOutgoingSalary(
  side: TradeSide,
  league: LeagueState,
  rules: LeagueRules,
): number {
  let total = 0
  for (const asset of side.outgoing) {
    if (asset.type === 'player' && asset.playerId) {
      const player = league.players[asset.playerId]
      if (player) {
        total += computeCapHit(player, rules, 0)
      }
    }
  }
  return total
}

function sumIncomingSalary(
  incoming: TradeSide['outgoing'],
  league: LeagueState,
  rules: LeagueRules,
): number {
  let total = 0
  for (const asset of incoming) {
    if (asset.type === 'player' && asset.playerId) {
      const player = league.players[asset.playerId]
      if (player) {
        total += computeCapHit(player, rules, 0)
      }
    }
  }
  return total
}

function checkSalaryMatch(
  outgoing: number,
  incoming: number,
  _rules: LeagueRules,
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

  const playerMoves: Array<{ player: Player; toTeamId: string }> = []
  for (const side of proposal.sides) {
    for (const asset of side.outgoing) {
      if (asset.type === 'player' && asset.playerId) {
        const player = newLeague.players[asset.playerId]
        if (player) {
          const toTeamId = findReceivingTeam(
            asset.playerId,
            side.teamId,
            proposal,
            'player',
          )
          if (toTeamId) playerMoves.push({ player, toTeamId })
        }
      }
    }
  }
  const targetByPlayer = new Map(playerMoves.map((m) => [m.player.id, m.toTeamId]))

  for (const [pid, toTeamId] of targetByPlayer) {
    const player = newLeague.players[pid]!
    const fromTeamId = player.teamId
    player.teamId = toTeamId

    if (fromTeamId) {
      const fromTeam = newLeague.teams[fromTeamId]
      if (fromTeam) {
        fromTeam.roster = fromTeam.roster.filter((id) => id !== pid)
      }
    }
    const toTeam = newLeague.teams[toTeamId]
    if (toTeam && !toTeam.roster.includes(pid)) {
      toTeam.roster = [...toTeam.roster, pid]
    }
  }

  for (const side of proposal.sides) {
    for (const asset of side.outgoing) {
      if (asset.type === 'pick' && asset.pickId) {
        const pick = newLeague.draftPicks.find((p) => p.id === asset.pickId)
        if (pick) {
          const toTeamId = findReceivingTeam(
            asset.pickId,
            side.teamId,
            proposal,
            'pick',
          )
          if (toTeamId) pick.currentTeamId = toTeamId
        }
      }
    }
  }

  const events: string[] = []
  const exceptionsCreated: TradeException[] = []

  for (const side of proposal.sides) {
    const team = newLeague.teams[side.teamId]!
    const outgoingSalary = sumOutgoingSalary(side, newLeague, rules)
    const incomingSalary = sumIncomingSalary(side.incoming, newLeague, rules)
    const cashOut = side.outgoing
      .filter((a) => a.type === 'cash')
      .reduce((sum, a) => sum + (a.cashAmount ?? 0), 0)
    const cashIn = side.incoming
      .filter((a) => a.type === 'cash')
      .reduce((sum, a) => sum + (a.cashAmount ?? 0), 0)
    const exceptionNet = Math.max(0, outgoingSalary - incomingSalary)
    void cashOut
    void cashIn

    if (exceptionNet > 0 && rules.tradeExceptionYears > 0) {
      const expiresAt = addYearsISO(newLeague.currentDate, rules.tradeExceptionYears)
      const exception: TradeException = {
        id: crypto.randomUUID(),
        teamId: side.teamId,
        amount: exceptionNet,
        expiresAt,
        source: 'outgoing_salary',
      }
      exceptionsCreated.push(exception)
      team.tradeExceptions = [...(team.tradeExceptions ?? []), exception]
    }

    const newPayroll = team.finances.payroll - outgoingSalary + incomingSalary
    team.finances = {
      ...team.finances,
      payroll: newPayroll,
      capSpace: rules.salaryCap - newPayroll,
    }

    team.finances.taxBill = newPayroll - rules.luxuryTaxLine > 0
      ? Math.round((newPayroll - rules.luxuryTaxLine) * 1.5)
      : 0
    team.finances.projectedTaxBill = team.finances.taxBill

    if (newPayroll >= rules.secondApron) {
      freeze1stRoundPicks(team, newLeague, rules.pickFreezeYears, newLeague.currentDate)
    }

    events.push(`${side.teamId} completed trade side`)
  }

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
      description: buildTradeDescription(proposal),
    },
  ]

  return { league: newLeague, events, tradeExceptionsCreated: exceptionsCreated }
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
  currentDate: string,
): void {
  const target = new Date(currentDate)
  target.setUTCFullYear(target.getUTCFullYear() + years)
  const targetSeason = `${target.getUTCFullYear()}-${String((target.getUTCMonth() + 1)).padStart(2, '0')}`

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

function buildTradeDescription(proposal: TradeProposal): string {
  const parts: string[] = []
  for (const side of proposal.sides) {
    const out = side.outgoing
      .map((a) =>
        a.type === 'player' && a.playerId ? `player:${a.playerId}` :
        a.type === 'pick' && a.pickId ? `pick:${a.pickId}` :
        a.type === 'cash' ? `cash:${a.cashAmount}` :
        a.type === 'exception' ? `exception:${a.exceptionId}` : 'unknown',
      )
      .join(', ')
    parts.push(`${side.teamId} out: ${out || '—'}`)
  }
  return parts.join(' | ')
}

function findReceivingTeam(
  assetId: string,
  fromTeamId: string,
  proposal: TradeProposal,
  kind: 'player' | 'pick',
): string | null {
  for (const side of proposal.sides) {
    if (side.teamId === fromTeamId) continue
    const hasIncoming = side.incoming.some((a) => {
      if (kind === 'player') return a.type === 'player' && a.playerId === assetId
      return a.type === 'pick' && a.pickId === assetId
    })
    if (hasIncoming) return side.teamId
  }
  return null
}
