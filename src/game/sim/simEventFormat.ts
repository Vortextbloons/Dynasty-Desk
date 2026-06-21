import type { ShotZone, SimEvent } from '@/game/models/sim'

const ZONE_LABEL: Record<ShotZone, string> = {
  at_rim: 'at the rim',
  short_mid: 'short mid',
  long_mid: 'long mid',
  corner_three: 'corner three',
  above_break_three: 'above-break three',
}

export function formatQuarter(period: number): string {
  if (period <= 4) return `Q${period}`
  return `OT${period - 4}`
}

export function formatClock(seconds: number): string {
  const totalSecs = Math.floor(seconds)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function describeSimEvent(
  ev: SimEvent,
  playerName: (id: string) => string,
): string {
  switch (ev.type) {
    case 'shot': {
      const made = ev.made ? 'made' : 'missed'
      const zone = ZONE_LABEL[ev.zone]
      const pts =
        ev.made && (ev.zone === 'corner_three' || ev.zone === 'above_break_three')
          ? ' 3PT'
          : ev.made
            ? ' 2PT'
            : ''
      const assist = ev.assistedBy ? ` (ast ${playerName(ev.assistedBy)})` : ''
      const block = ev.blockedBy ? ` (blk ${playerName(ev.blockedBy)})` : ''
      return `${playerName(ev.playerId)} ${made} ${zone}${pts}${assist}${block}`
    }
    case 'rebound': {
      const side = ev.offensive ? 'offensive' : 'defensive'
      return `${playerName(ev.playerId)} ${side} rebound`
    }
    case 'turnover': {
      return `${playerName(ev.playerId)} turnover (${ev.turnoverType.replace('_', ' ')})${
        ev.stolenBy ? `, stolen by ${playerName(ev.stolenBy)}` : ''
      }`
    }
    case 'foul': {
      return `${playerName(ev.playerId)} ${ev.kind} foul${
        ev.fouledPlayerId ? ` on ${playerName(ev.fouledPlayerId)}` : ''
      }`
    }
    case 'freeThrow':
      return `${playerName(ev.playerId)} FT ${ev.attempt} ${ev.made ? 'made' : 'missed'}`
    case 'endOfPeriod':
      return ev.period > 0 ? `End of ${formatQuarter(ev.period)}` : 'Tip-off'
    case 'substitution':
      return `Substitution: ${playerName(ev.in)} in for ${playerName(ev.out)}`
    default:
      return ''
  }
}

export function isScoringSimEvent(ev: SimEvent): boolean {
  if (ev.type === 'shot' && ev.made) return true
  if (ev.type === 'freeThrow' && ev.made) return true
  return false
}

export function isFeedWorthySimEvent(ev: SimEvent): boolean {
  if (ev.type === 'substitution') return false
  return true
}
