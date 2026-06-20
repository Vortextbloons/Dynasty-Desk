import type { Player } from '@/game/models/player'
import type { Team, TeamDirection } from '@/game/models/team'
import type { LeagueState } from '@/game/models/league'
import type { TradeProposal } from '@/game/models/trade'
import { computeTradeValueDelta, type TradeValueContext } from './tradeValueModel'
import { computeCapHit } from './capEngine'

export interface TradeAIContext {
  projectedWins: Record<string, number>
  userTeamId: string
  league: LeagueState
}

export type AIResponse =
  | { kind: 'accepted' }
  | { kind: 'counter'; counterOffer: TradeProposal }
  | { kind: 'rejected'; reason: string }
  | { kind: 'vetoed'; reason: string; vetoingOwnerName: string; vetoingTeamId: string }

export function evaluateTradeForAI(
  proposal: TradeProposal,
  aiTeam: Team,
  context: TradeAIContext,
): AIResponse {
  const league = context.league
  const leaguePlayers = league.players
  const leaguePicks = league.draftPicks
  const teams = league.teams

  const ctx: TradeValueContext = {
    teamDirection: aiTeam.direction,
    positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 },
  }

  const { perSideValue } = computeTradeValueDelta(
    proposal.sides,
    (teamId) => teams[teamId],
    (playerId) => leaguePlayers[playerId],
    (pickId) => leaguePicks.find((p) => p.id === pickId),
    context.projectedWins,
    ctx,
  )

  const sideValue = perSideValue[aiTeam.id]
  if (!sideValue) {
    return { kind: 'rejected', reason: 'Team not found in proposal.' }
  }

  if (sideValue.delta < -10) {
    return { kind: 'rejected', reason: 'Offer is well below market value.' }
  }

  if (sideValue.delta < 5) {
    const counter = buildCounterOffer(proposal, aiTeam, leaguePlayers, leaguePicks, teams)
    if (counter) {
      return { kind: 'counter', counterOffer: counter }
    }
    return { kind: 'rejected', reason: 'Insufficient compensation.' }
  }

  const veto = checkOwnerVeto(aiTeam, proposal, sideValue.delta, league, leaguePlayers)
  if (veto) return veto

  return { kind: 'accepted' }
}

export function updateTeamDirection(
  team: Team,
  standings: { wins: number; losses: number } | undefined,
  league: LeagueState,
): TeamDirection {
  if (team.id === league.userTeamId) return team.direction

  const wins = standings?.wins ?? 41
  const losses = standings?.losses ?? 41
  const totalGames = wins + losses
  if (totalGames === 0) return team.direction

  const winPct = wins / totalGames
  const sorted = Object.values(league.standings).sort(
    (a, b) => b.wins - a.wins,
  )
  let rank = sorted.findIndex((s) => s.teamId === team.id) + 1
  if (rank === 0) {
    rank = team.direction === 'contender' ? 2 : 21
  }

  const rosterPlayers = team.roster
    .map((id) => league.players[id])
    .filter((p): p is Player => Boolean(p))
  const avgAge =
    rosterPlayers.length > 0
      ? rosterPlayers.reduce((sum, p) => sum + p.age, 0) / rosterPlayers.length
      : 27

  let next: TeamDirection = team.direction

  if (rank <= 4 && avgAge > 28) next = 'contender'
  else if (rank > 20 && avgAge < 26) {
    next = winPct < 0.3 ? 'tanking' : 'rebuilding'
  } else if (rank > 14) next = 'playoff_push'
  else if (rank > 8) next = 'playoff_push'
  else next = 'middle'

  return next
}

function buildCounterOffer(
  proposal: TradeProposal,
  aiTeam: Team,
  _players: Record<string, Player>,
  picks: LeagueState['draftPicks'],
  _teams: Record<string, Team>,
): TradeProposal | null {
  const side = proposal.sides.find((s) => s.teamId === aiTeam.id)
  if (!side) return null

  const teamPicks = picks.filter((p) => p.currentTeamId === aiTeam.id)
  const futureSecond = teamPicks
    .filter((p) => p.round === 2)
    .sort((a, b) => a.season.localeCompare(b.season))[0]

  if (!futureSecond) {
    return {
      ...proposal,
      id: crypto.randomUUID(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
  }

  const sides = proposal.sides.map((s) => {
    if (s.teamId !== aiTeam.id) return s
    return {
      ...s,
      incoming: [
        ...s.incoming,
        { type: 'pick' as const, pickId: futureSecond.id },
      ],
    }
  })

  return {
    ...proposal,
    id: crypto.randomUUID(),
    sides,
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
}

function checkOwnerVeto(
  aiTeam: Team,
  proposal: TradeProposal,
  _delta: number,
  league: LeagueState,
  players: Record<string, Player>,
): AIResponse | null {
  const owner = aiTeam.owner
  if (!owner) return null

  const projectedPayroll = computeProjectedPayroll(aiTeam, proposal, players)
  const taxLine = league.rules.luxuryTaxLine
  const secondApron = league.rules.secondApron

  switch (owner.personality) {
    case 'frugal': {
      if (projectedPayroll > taxLine && aiTeam.finances.payroll <= taxLine) {
        return {
          kind: 'vetoed',
          reason: `${owner.name} refuses to push the team over the luxury tax line.`,
          vetoingOwnerName: owner.name,
          vetoingTeamId: aiTeam.id,
        }
      }
      return null
    }
    case 'spendthrift':
    case 'win_now': {
      const tankingStar = proposal.sides.some((s) => {
        if (s.teamId !== aiTeam.id) return false
        return s.outgoing.some((a) => {
          if (a.type !== 'player' || !a.playerId) return false
          const p = players[a.playerId]
          return p && p.ratings.overall >= 80
        })
      })
      if (tankingStar && (aiTeam.direction === 'contender' || aiTeam.direction === 'playoff_push')) {
        return {
          kind: 'vetoed',
          reason: `${owner.name} refuses to trade a star mid-window.`,
          vetoingOwnerName: owner.name,
          vetoingTeamId: aiTeam.id,
        }
      }
      return null
    }
    case 'meddler': {
      const starOutgoing = proposal.sides.find((s) => s.teamId === aiTeam.id)?.outgoing.find((a) => {
        if (a.type !== 'player' || !a.playerId) return false
        const p = players[a.playerId]
        return p && p.ratings.overall >= 80
      })
      if (starOutgoing && Math.random() < 0.05) {
        return {
          kind: 'vetoed',
          reason: `${owner.name} personally blocked a deal for a star player.`,
          vetoingOwnerName: owner.name,
          vetoingTeamId: aiTeam.id,
        }
      }
      if (projectedPayroll >= secondApron) {
        return {
          kind: 'vetoed',
          reason: `${owner.name} refuses to enter second apron territory.`,
          vetoingOwnerName: owner.name,
          vetoingTeamId: aiTeam.id,
        }
      }
      return null
    }
    case 'patient':
    case 'hands_off':
    default:
      return null
  }
}

function computeProjectedPayroll(
  team: Team,
  proposal: TradeProposal,
  players: Record<string, Player>,
): number {
  const side = proposal.sides.find((s) => s.teamId === team.id)
  if (!side) return team.finances.payroll

  let payroll = team.finances.payroll
  for (const asset of side.outgoing) {
    if (asset.type === 'player' && asset.playerId) {
      const p = players[asset.playerId]
      if (p) payroll -= computeCapHit(p, { salaryCap: 0 } as never)
    }
  }
  for (const asset of side.incoming) {
    if (asset.type === 'player' && asset.playerId) {
      const p = players[asset.playerId]
      if (p) payroll += computeCapHit(p, { salaryCap: 0 } as never)
    }
  }
  return payroll
}
