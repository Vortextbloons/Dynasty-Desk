import type { Player } from '@/game/models/player'
import type { DraftPick } from '@/game/models/draft'
import type { LeagueState } from '@/game/models/league'
import type { Team } from '@/game/models/team'
import type { TradeProposal, TradeSide } from '@/game/models/trade'
import { validateTradeLegality } from './tradeEngine'
import { computeTradeValueDelta } from './tradeValueModel'

export interface TradeFinderOptions {
  maxResults: number
  capFlexibility: 'strict' | 'loose'
}

export function findTrades(
  userTeam: Team,
  targetPlayerId: string,
  league: LeagueState,
  options: TradeFinderOptions,
): TradeProposal[] {
  const target = league.players[targetPlayerId]
  if (!target || !target.teamId) return []

  const holdingTeam = league.teams[target.teamId]
  if (!holdingTeam) return []

  const candidates: TradeProposal[] = []

  const userPlayers = userTeam.roster
    .map((id) => league.players[id])
    .filter((p): p is Player => Boolean(p))

  const userPicks = league.draftPicks.filter(
    (p) => p.currentTeamId === userTeam.id,
  )

  for (const combo of enumerateSubsets(userPlayers, options.maxResults)) {
    const proposal = build2TeamProposal(userTeam, holdingTeam, combo, userPicks.slice(0, 1), target)
    const legality = validateTradeLegality(proposal, league, league.rules)
    if (!legality.legal) continue

    const { perSideValue } = computeTradeValueDelta(
      proposal.sides,
      (teamId) => league.teams[teamId],
      (playerId) => league.players[playerId],
      (pickId) => league.draftPicks.find((p) => p.id === pickId),
      { [userTeam.id]: 41, [holdingTeam.id]: 41 },
      { teamDirection: 'middle', positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } },
    )
    const userDelta = perSideValue[userTeam.id]?.delta ?? 0
    proposal.id = crypto.randomUUID()
    ;(proposal as TradeProposal & { _delta?: number })._delta = Math.abs(userDelta)
    candidates.push(proposal)
  }

  candidates.sort(
    (a, b) =>
      ((a as TradeProposal & { _delta?: number })._delta ?? 0) -
      ((b as TradeProposal & { _delta?: number })._delta ?? 0),
  )

  return candidates.slice(0, options.maxResults)
}

function build2TeamProposal(
  userTeam: Team,
  holdingTeam: Team,
  outgoing: Player[],
  outgoingPicks: DraftPick[],
  target: Player,
): TradeProposal {
  const userSide: TradeSide = {
    teamId: userTeam.id,
    outgoing: [
      ...outgoing.map((p) => ({ type: 'player' as const, playerId: p.id })),
      ...outgoingPicks.map((p) => ({ type: 'pick' as const, pickId: p.id })),
    ],
    incoming: [
      { type: 'player' as const, playerId: target.id },
    ],
  }
  const otherSide: TradeSide = {
    teamId: holdingTeam.id,
    outgoing: [{ type: 'player' as const, playerId: target.id }],
    incoming: userSide.outgoing,
  }
  return {
    id: crypto.randomUUID(),
    sides: [userSide, otherSide],
    createdAt: new Date().toISOString(),
    status: 'draft',
  }
}

function* enumerateSubsets(players: Player[], maxResults: number): Generator<Player[]> {
  const n = players.length
  const total = Math.min(1 << n, 256)
  let count = 0
  for (let mask = 1; mask < total && count < maxResults * 8; mask++) {
    const subset: Player[] = []
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(players[i]!)
    }
    if (subset.length === 0) continue
    yield subset
    count++
  }
}
