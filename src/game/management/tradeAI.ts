import type { Player } from '@/game/models/player'
import type { Team, TeamDirection } from '@/game/models/team'
import type { LeagueState } from '@/game/models/league'
import type { TradeProposal } from '@/game/models/trade'
import type { Position } from '@/game/models/position'
import { computeTradeValueDelta, type TradeValueContext } from './tradeValueModel'
import { computeCapHit } from './capEngine'
import { updateAITeamDirection } from './aiTeamDirectionEngine'

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

  const positionNeed = computePositionNeed(aiTeam, leaguePlayers)
  const ctx: TradeValueContext = {
    teamDirection: aiTeam.direction,
    positionNeed,
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
  return updateAITeamDirection(team, standings, league)
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

  const teamPicks = picks.filter(
    (p) => p.currentTeamId === aiTeam.id && !side.outgoing.some(
      (a) => a.type === 'pick' && a.pickId === p.id,
    ),
  )
  const futureSecond = teamPicks
    .filter((p) => p.round === 2 && !p.stepienBlocked)
    .sort((a, b) => a.season.localeCompare(b.season))[0]

  if (!futureSecond) return null

  const otherSides = proposal.sides.filter((s) => s.teamId !== aiTeam.id)
  if (otherSides.length === 0) return null

  const targetSide =
    otherSides.length === 1
      ? otherSides[0]!
      : [...otherSides].sort(
          (a, b) => a.incoming.length - b.incoming.length,
        )[0]!

  const newAsset: { type: 'pick'; pickId: string; toTeamId: string } = {
    type: 'pick',
    pickId: futureSecond.id,
    toTeamId: targetSide.teamId,
  }

  const sides = proposal.sides.map((s) => {
    if (s.teamId !== aiTeam.id) return s
    return {
      ...s,
      outgoing: [...s.outgoing, newAsset],
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
      if (starOutgoing && deterministicRoll(proposal.id + ':' + aiTeam.id, 0.05)) {
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

function deterministicRoll(seed: string, threshold: number): boolean {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  const value = (hash & 0xfffffff) / 0xfffffff
  return value < threshold
}

function computePositionNeed(team: Team, players: Record<string, Player>): Record<Position, number> {
  const need: Record<Position, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 }
  const positionCounts: Record<Position, number[]> = { PG: [], SG: [], SF: [], PF: [], C: [] }

  for (const pid of team.roster) {
    const p = players[pid]
    if (!p) continue
    positionCounts[p.position]?.push(p.ratings.overall ?? 50)
  }

  const maxPerPos = 3
  for (const pos of Object.keys(need) as Position[]) {
    const count = positionCounts[pos]?.length ?? 0
    const avgOvr = positionCounts[pos]?.length
      ? positionCounts[pos]!.reduce((a, b) => a + b, 0) / positionCounts[pos]!.length
      : 0
    const countGap = Math.max(0, maxPerPos - count) / maxPerPos
    const qualityGap = Math.max(0, 70 - avgOvr) / 70
    need[pos] = Math.min(1, countGap * 0.6 + qualityGap * 0.4)
  }

  return need
}
