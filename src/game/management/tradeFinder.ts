import type { Player } from '@/game/models/player'
import type { DraftPick } from '@/game/models/draft'
import type { LeagueState } from '@/game/models/league'
import type { Team } from '@/game/models/team'
import type { TradeProposal, TradeSide, TradeAsset } from '@/game/models/trade'
import { validateTradeLegality } from './tradeEngine'
import { computeTradeValueDelta } from './tradeValueModel'

export interface TradeFinderOptions {
  maxResults: number
  capFlexibility: 'strict' | 'loose'
  multiTeam?: boolean
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
    (p) => p.currentTeamId === userTeam.id && !p.stepienBlocked,
  )

  const projectedWins: Record<string, number> = {}
  for (const [tid, standing] of Object.entries(league.standings)) {
    projectedWins[tid] = standing.wins || 41
  }
  if (Object.keys(projectedWins).length === 0) {
    projectedWins[userTeam.id] = 41
    projectedWins[holdingTeam.id] = 41
  }

  const capLoose = options.capFlexibility === 'loose'
  const maxPlayerSubsets = capLoose ? 64 : 32

  for (const combo of enumerateSubsets(userPlayers, maxPlayerSubsets)) {
    for (const pickCombo of pickCombinations(userPicks, capLoose ? 2 : 1)) {
      const proposal = build2TeamProposal(
        userTeam,
        holdingTeam,
        combo,
        pickCombo,
        target,
      )
      const legality = validateTradeLegality(proposal, league, league.rules)
      if (!legality.legal) continue

      const { perSideValue } = computeTradeValueDelta(
        proposal.sides,
        (teamId) => league.teams[teamId],
        (playerId) => league.players[playerId],
        (pickId) => league.draftPicks.find((p) => p.id === pickId),
        projectedWins,
        { teamDirection: 'middle', positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } },
      )
      const userDelta = perSideValue[userTeam.id]?.delta ?? 0
      proposal.id = crypto.randomUUID()
      ;(proposal as TradeProposal & { _delta?: number })._delta = Math.abs(userDelta)
      candidates.push(proposal)
    }
  }

  if (options.multiTeam) {
    const multiTeamProposals = findMultiTeamTrades(userTeam, targetPlayerId, league, options)
    candidates.push(...multiTeamProposals)
  }

  candidates.sort(
    (a, b) =>
      ((a as TradeProposal & { _delta?: number })._delta ?? 0) -
      ((b as TradeProposal & { _delta?: number })._delta ?? 0),
  )

  return candidates.slice(0, options.maxResults)
}

function* pickCombinations(
  picks: DraftPick[],
  maxPicks: number,
): Generator<DraftPick[]> {
  yield []
  for (let i = 0; i < picks.length && i < maxPicks; i++) {
    yield [picks[i]!]
    for (let j = i + 1; j < picks.length && j < maxPicks; j++) {
      yield [picks[i]!, picks[j]!]
    }
  }
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

function findMultiTeamTrades(
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
    (p) => p.currentTeamId === userTeam.id && !p.stepienBlocked,
  )

  const otherTeams = Object.values(league.teams).filter(
    (t) => t.id !== userTeam.id && t.id !== holdingTeam.id,
  )

  const projectedWins: Record<string, number> = {}
  for (const [tid, standing] of Object.entries(league.standings)) {
    projectedWins[tid] = standing.wins || 41
  }

  for (const thirdTeam of otherTeams) {
    for (const combo of enumerateSubsets(userPlayers, 16)) {
      for (const pickCombo of pickCombinations(userPicks, 1)) {
        const thirdPlayers = thirdTeam.roster
          .map((id) => league.players[id])
          .filter((p): p is Player => Boolean(p))
          .slice(0, 3)

        for (const thirdPlayer of thirdPlayers) {
          const proposal = build3TeamProposal(
            userTeam,
            holdingTeam,
            thirdTeam,
            combo,
            pickCombo,
            target,
            thirdPlayer,
          )

          const legality = validateTradeLegality(proposal, league, league.rules)
          if (!legality.legal) continue

          const { perSideValue } = computeTradeValueDelta(
            proposal.sides,
            (teamId) => league.teams[teamId],
            (playerId) => league.players[playerId],
            (pickId) => league.draftPicks.find((p) => p.id === pickId),
            projectedWins,
            { teamDirection: 'middle', positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } },
          )

          const userDelta = perSideValue[userTeam.id]?.delta ?? 0
          proposal.id = crypto.randomUUID()
          ;(proposal as TradeProposal & { _delta?: number })._delta = Math.abs(userDelta)
          candidates.push(proposal)
        }
      }
    }
  }

  candidates.sort(
    (a, b) =>
      ((a as TradeProposal & { _delta?: number })._delta ?? 0) -
      ((b as TradeProposal & { _delta?: number })._delta ?? 0),
  )

  return candidates.slice(0, options.maxResults)
}

function build3TeamProposal(
  userTeam: Team,
  holdingTeam: Team,
  thirdTeam: Team,
  userPlayers: Player[],
  userPicks: DraftPick[],
  target: Player,
  thirdPlayer: Player,
): TradeProposal {
  const userOutgoing: TradeAsset[] = [
    ...userPlayers.map((p) => ({ type: 'player' as const, playerId: p.id })),
    ...userPicks.map((p) => ({ type: 'pick' as const, pickId: p.id })),
  ]
  const userSide: TradeSide = {
    teamId: userTeam.id,
    outgoing: userOutgoing,
    incoming: [{ type: 'player', playerId: target.id }],
  }
  const holdingSide: TradeSide = {
    teamId: holdingTeam.id,
    outgoing: [{ type: 'player', playerId: target.id }],
    incoming: [{ type: 'player', playerId: thirdPlayer.id }],
  }
  const thirdSide: TradeSide = {
    teamId: thirdTeam.id,
    outgoing: [{ type: 'player', playerId: thirdPlayer.id }],
    incoming: userOutgoing,
  }
  return {
    id: crypto.randomUUID(),
    sides: [userSide, holdingSide, thirdSide],
    createdAt: new Date().toISOString(),
    status: 'draft',
  }
}
