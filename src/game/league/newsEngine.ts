import type { NewsEvent, NewsType, NewsImportance } from '@/game/models/news'
import type { Player } from '@/game/models/player'
import type { AwardType } from '@/game/models/award'
import { AWARD_LABELS } from '@/game/models/award'

function baseNews(
  type: NewsType,
  headline: string,
  body: string,
  opts: {
    date: string
    teamIds?: string[]
    playerIds?: string[]
    importance?: NewsImportance
  },
): NewsEvent {
  return {
    id: crypto.randomUUID(),
    date: opts.date,
    type,
    headline,
    body,
    teamIds: opts.teamIds ?? [],
    playerIds: opts.playerIds ?? [],
    importance: opts.importance ?? 'medium',
    read: false,
  }
}

export function createMilestoneEvent(
  player: Player,
  milestone: string,
  date: string,
): NewsEvent {
  const name = `${player.firstName} ${player.lastName}`
  return baseNews(
    'milestone',
    `${name} reaches ${milestone}`,
    `${name} has reached a career milestone: ${milestone}.`,
    {
      date,
      playerIds: [player.id],
      teamIds: player.teamId ? [player.teamId] : [],
      importance: 'high',
    },
  )
}

export function createHotStreakEvent(
  teamName: string,
  teamId: string,
  length: number,
  date: string,
): NewsEvent {
  return baseNews(
    'hot_streak',
    `${teamName} on ${length}-game win streak`,
    `${teamName} have won ${length} straight games.`,
    { date, teamIds: [teamId], importance: length >= 8 ? 'high' : 'medium' },
  )
}

export function createColdStreakEvent(
  teamName: string,
  teamId: string,
  length: number,
  date: string,
): NewsEvent {
  return baseNews(
    'cold_streak',
    `${teamName} skid reaches ${length} games`,
    `${teamName} have lost ${length} straight.`,
    { date, teamIds: [teamId], importance: length >= 8 ? 'high' : 'medium' },
  )
}

export function createBreakoutEvent(player: Player, date: string): NewsEvent {
  const name = `${player.firstName} ${player.lastName}`
  return baseNews(
    'development_breakout',
    `${name} having a breakout season`,
    `${name} is exceeding expectations and drawing league-wide attention.`,
    {
      date,
      playerIds: [player.id],
      teamIds: player.teamId ? [player.teamId] : [],
      importance: 'medium',
    },
  )
}

export function createBustEvent(player: Player, date: string): NewsEvent {
  const name = `${player.firstName} ${player.lastName}`
  return baseNews(
    'development_bust',
    `${name} struggling to meet potential`,
    `${name} has underperformed projections this season.`,
    {
      date,
      playerIds: [player.id],
      teamIds: player.teamId ? [player.teamId] : [],
      importance: 'low',
    },
  )
}

export function createAwardEvent(
  award: AwardType,
  player: Player,
  date: string,
): NewsEvent {
  const name = `${player.firstName} ${player.lastName}`
  const label = AWARD_LABELS[award]
  return baseNews(
    'award_race',
    `${name} wins ${label}`,
    `${name} has been named ${label}.`,
    {
      date,
      playerIds: [player.id],
      teamIds: player.teamId ? [player.teamId] : [],
      importance: 'high',
    },
  )
}

export function createMoraleEvent(player: Player, date: string): NewsEvent {
  const name = `${player.firstName} ${player.lastName}`
  return baseNews(
    'player_morale',
    `${name} requests trade`,
    `${name} has grown frustrated with their role and is seeking a trade.`,
    {
      date,
      playerIds: [player.id],
      teamIds: player.teamId ? [player.teamId] : [],
      importance: 'high',
    },
  )
}

export function createInjuryNews(
  player: Player,
  description: string,
  date: string,
): NewsEvent {
  const name = `${player.firstName} ${player.lastName}`
  return baseNews(
    'player_injury',
    `${name} injured — ${description}`,
    `${name} will miss time with ${description}.`,
    {
      date,
      playerIds: [player.id],
      teamIds: player.teamId ? [player.teamId] : [],
      importance: 'medium',
    },
  )
}

export function createDirectionChangeNews(
  teamName: string,
  teamId: string,
  from: string,
  to: string,
  reason: string,
  date: string,
): NewsEvent {
  return baseNews(
    'team_direction',
    `${teamName} shift from ${from} to ${to}`,
    reason,
    { date, teamIds: [teamId], importance: 'low' },
  )
}

export function filterNews(
  news: NewsEvent[],
  filters: {
    type?: NewsType
    teamId?: string
    playerId?: string
    importance?: NewsImportance
    unreadOnly?: boolean
  },
): NewsEvent[] {
  return news.filter((n) => {
    if (filters.type && n.type !== filters.type) return false
    if (filters.teamId && !n.teamIds.includes(filters.teamId)) return false
    if (filters.playerId && !n.playerIds.includes(filters.playerId)) return false
    if (filters.importance && n.importance !== filters.importance) return false
    if (filters.unreadOnly && n.read) return false
    return true
  })
}

export function markNewsRead(news: NewsEvent[], newsId: string): NewsEvent[] {
  return news.map((n) => (n.id === newsId ? { ...n, read: true } : n))
}

export function markAllNewsRead(news: NewsEvent[]): NewsEvent[] {
  return news.map((n) => ({ ...n, read: true }))
}

export function createRecordBrokenEvent(
  record: { category: string; value: number; playerId?: string },
  playerId: string,
  date: string,
): NewsEvent {
  const catLabel = record.category.replace(/_/g, ' ')
  return baseNews(
    'record_broken',
    `New record: ${catLabel} — ${record.value}`,
    `A new ${catLabel} record has been set with a value of ${record.value}.`,
    {
      date,
      playerIds: [playerId],
      importance: 'high',
    },
  )
}

export function createCoachPressureEvent(
  teamId: string,
  teamName: string,
  pressureLevel: 'medium' | 'high',
  date: string,
): NewsEvent {
  return baseNews(
    'coach_pressure',
    `${teamName} coaching seat ${pressureLevel === 'high' ? 'hot' : 'warm'}`,
    `${teamName} management is ${pressureLevel === 'high' ? 'seriously' : 'quietly'} evaluating the coaching situation.`,
    { date, teamIds: [teamId], importance: pressureLevel === 'high' ? 'high' : 'medium' },
  )
}

export function createRosterChangeEvent(
  playerId: string,
  playerName: string,
  fromTeamName: string | null,
  toTeamName: string | null,
  reason: string,
  date: string,
): NewsEvent {
  const from = fromTeamName ? ` from ${fromTeamName}` : ''
  const to = toTeamName ? ` to ${toTeamName}` : ''
  return baseNews(
    'roster_change',
    `${playerName} ${reason}${from}${to}`,
    `${playerName} has ${reason}${from}${to}.`,
    {
      date,
      playerIds: [playerId],
      teamIds: [],
      importance: 'medium',
    },
  )
}

