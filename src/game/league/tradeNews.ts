import type { NewsEvent, NewsImportance } from '@/game/models/news'
import type { LeagueState } from '@/game/models/league'
import type { TradeProposal, TradeAsset } from '@/game/models/trade'

export function createTradeCompletedEvent(
  proposal: TradeProposal,
  league: LeagueState,
): NewsEvent {
  const sides = proposal.sides.map((side) => {
    const teamName = league.teams[side.teamId]?.name ?? side.teamId
    const incomingNames = side.incoming
      .map((a) => describeAsset(a, league))
      .join(', ')
    return `${teamName} receives ${incomingNames || 'nothing'}`
  })
  return {
    id: crypto.randomUUID(),
    date: league.currentDate,
    type: 'trade_completed',
    headline: `Trade completed (${proposal.sides.length} teams)`,
    body: sides.join(' • '),
    teamIds: proposal.sides.map((s) => s.teamId),
    playerIds: proposal.sides.flatMap((s) =>
      s.incoming
        .filter((a) => a.type === 'player' && a.playerId)
        .map((a) => a.playerId!)
    ),
    importance: proposal.sides.some((s) =>
      s.incoming.some(
        (a) =>
          a.type === 'player' &&
          a.playerId &&
          (league.players[a.playerId]?.ratings.overall ?? 0) >= 85,
      ),
    )
      ? 'high'
      : 'medium',
  }
}

export function createVetoEvent(
  proposal: TradeProposal,
  league: LeagueState,
  ownerName: string,
  reason: string,
): NewsEvent {
  const teamName = league.teams[proposal.sides[0]?.teamId ?? '']?.name ?? 'Team'
  return {
    id: crypto.randomUUID(),
    date: league.currentDate,
    type: 'trade_vetoed',
    headline: `Trade vetoed by ${ownerName}`,
    body: `${ownerName} (${teamName}) blocked the deal: ${reason}`,
    teamIds: proposal.sides.map((s) => s.teamId),
    playerIds: [],
    importance: 'medium',
  }
}

export function createTradeRumorEvent(
  teamName: string,
  playerId: string,
  playerName: string,
  date: string,
  importance: NewsImportance = 'low',
): NewsEvent {
  return {
    id: crypto.randomUUID(),
    date,
    type: 'trade_rumor',
    headline: `${teamName} exploring trades for ${playerName}`,
    body: `League sources say the ${teamName} are checking the market for ${playerName}.`,
    teamIds: [],
    playerIds: [playerId],
    importance,
  }
}

export function createTradeLockedEvent(date: string): NewsEvent {
  return {
    id: crypto.randomUUID(),
    date,
    type: 'trade_locked',
    headline: 'Trade market closed for the playoffs',
    body: 'Trades are locked while the playoffs are in progress. The market will reopen in the offseason.',
    teamIds: [],
    playerIds: [],
    importance: 'low',
  }
}

function describeAsset(asset: TradeAsset, league: LeagueState): string {
  if (asset.type === 'player' && asset.playerId) {
    const p = league.players[asset.playerId]
    return p ? `${p.firstName} ${p.lastName}` : 'player'
  }
  if (asset.type === 'pick' && asset.pickId) {
    const p = league.draftPicks.find((pp) => pp.id === asset.pickId)
    if (!p) return 'pick'
    return `${p.season} Rd${p.round}`
  }
  if (asset.type === 'cash') {
    return `$${((asset.cashAmount ?? 0) / 1_000_000).toFixed(1)}M`
  }
  if (asset.type === 'exception') {
    return 'TPE'
  }
  return 'asset'
}
