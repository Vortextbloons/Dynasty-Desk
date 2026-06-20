import type { NewsEvent, NewsImportance } from '@/game/models/news'
import type { TradeProposal } from '@/game/models/trade'

export function createTradeCompletedEvent(
  proposal: TradeProposal,
  date: string,
  teamIdMap: Record<string, string>,
): NewsEvent {
  const sides = proposal.sides.map((side) => {
    const teamName = teamIdMap[side.teamId] ?? side.teamId
    const incoming = side.incoming
      .map((a) => {
        if (a.type === 'player' && a.playerId) return 'player'
        if (a.type === 'pick' && a.pickId) return 'pick'
        if (a.type === 'cash') return 'cash'
        return 'asset'
      })
      .join(', ')
    return `${teamName} gets ${incoming || 'nothing'}`
  })
  return {
    id: crypto.randomUUID(),
    date,
    type: 'trade_completed',
    headline: `Trade completed (${proposal.sides.length} teams)`,
    body: sides.join(' • '),
    teamIds: proposal.sides.map((s) => s.teamId),
    playerIds: proposal.sides.flatMap((s) =>
      s.incoming.filter((a) => a.type === 'player').map((a) => a.playerId!),
    ),
    importance: 'medium',
  }
}

export function createVetoEvent(
  proposal: TradeProposal,
  ownerName: string,
  reason: string,
  date: string,
): NewsEvent {
  return {
    id: crypto.randomUUID(),
    date,
    type: 'trade_vetoed',
    headline: `Trade vetoed by ${ownerName}`,
    body: reason,
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
