import type { GameState, SimEvent } from '@/game/models/sim'
import type { Player } from '@/game/models/player'
import {
  describeSimEvent,
  formatClock,
  formatQuarter,
  isFeedWorthySimEvent,
  isScoringSimEvent,
} from './simEventFormat'

export interface LiveGameSnapshot {
  gameId: string
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  period: number
  timeRemainingSeconds: number
  possession: 'home' | 'away'
  recentEvents: SimEvent[]
}

export interface LiveGamePlayLine {
  id: string
  text: string
  periodLabel: string
  clock: string
  isScoring: boolean
}

export interface LiveGameSimViewState {
  gameId: string
  homeAbbr: string
  awayAbbr: string
  homeScore: number
  awayScore: number
  periodLabel: string
  clock: string
  playLines: LiveGamePlayLine[]
}

export function snapshotToViewState(
  snapshot: LiveGameSnapshot,
  homeAbbr: string,
  awayAbbr: string,
  players: Record<string, Player | undefined>,
): LiveGameSimViewState {
  return {
    gameId: snapshot.gameId,
    homeAbbr,
    awayAbbr,
    homeScore: snapshot.homeScore,
    awayScore: snapshot.awayScore,
    periodLabel: formatQuarter(snapshot.period),
    clock: formatClock(snapshot.timeRemainingSeconds),
    playLines: formatLivePlayLines(snapshot.recentEvents, players),
  }
}

export function buildLiveGameSnapshot(state: GameState): LiveGameSnapshot {
  const recentEvents = state.events.filter(isFeedWorthySimEvent).slice(-14)
  return {
    gameId: state.id,
    homeTeamId: state.homeTeamId,
    awayTeamId: state.awayTeamId,
    homeScore: state.score.home,
    awayScore: state.score.away,
    period: state.clock.period,
    timeRemainingSeconds: state.clock.timeRemainingSeconds,
    possession: state.possession,
    recentEvents,
  }
}

export function formatLivePlayLines(
  events: SimEvent[],
  players: Record<string, Player | undefined>,
): LiveGamePlayLine[] {
  const playerName = (id: string) => {
    const p = players[id]
    return p ? `${p.firstName.charAt(0)}. ${p.lastName}` : id
  }

  return events
    .map((ev, idx) => {
      const text = describeSimEvent(ev, playerName)
      if (!text) return null
      const period =
        ev.type === 'endOfPeriod' ? ev.period + 1 : ('period' in ev ? ev.period : 1)
      const clock =
        ev.type === 'endOfPeriod'
          ? '0:00'
          : 'timeRemainingSeconds' in ev
            ? formatClock(ev.timeRemainingSeconds)
            : '—'
      return {
        id: `${period}-${clock}-${idx}`,
        text,
        periodLabel: formatQuarter(Math.min(period, 7)),
        clock,
        isScoring: isScoringSimEvent(ev),
      }
    })
    .filter((line): line is LiveGamePlayLine => line !== null)
    .reverse()
}
