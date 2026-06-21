import type { SimEvent, ShotZone } from '@/game/models'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'

const ZONE_LABEL: Record<ShotZone, string> = {
  at_rim: 'at the rim',
  short_mid: 'short mid',
  long_mid: 'long mid',
  corner_three: 'corner three',
  above_break_three: 'above-break three',
}

function formatQuarter(period: number): string {
  if (period <= 4) return `Q${period}`
  return `OT${period - 4}`
}

function formatTime(seconds: number): string {
  const totalSecs = Math.floor(seconds)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function describeEvent(ev: SimEvent, playerName: (id: string) => string): string {
  switch (ev.type) {
    case 'shot': {
      const made = ev.made ? 'made' : 'missed'
      const zone = ZONE_LABEL[ev.zone]
      const pts = ev.made ? (ev.zone === 'corner_three' || ev.zone === 'above_break_three' ? '3PT' : '2PT') : ''
      const assist = ev.assistedBy ? ` (ast ${playerName(ev.assistedBy)})` : ''
      const block = ev.blockedBy ? ` (blk ${playerName(ev.blockedBy)})` : ''
      return `${playerName(ev.playerId)} ${made} ${zone}${pts ? ' ' + pts : ''}${assist}${block}`
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
    default:
      return ''
  }
}

interface Props {
  plays: SimEvent[]
  playerLookup: Map<string, { firstName: string; lastName: string }>
}

export function KeyPlaysList({ plays, playerLookup }: Props) {
  const playerName = (id: string) => {
    const meta = playerLookup.get(id)
    return meta ? `${meta.firstName.charAt(0)}. ${meta.lastName}` : id
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Key plays — top {plays.length}
        </div>
        {plays.length === 0 ? (
          <EmptyState description="No notable plays recorded." />
        ) : (
          <ol className="space-y-2">
            {plays.map((ev, idx) => {
              const desc = describeEvent(ev, playerName)
              if (!desc) return null
              return (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-3)] text-[10px] font-semibold">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div>{desc}</div>
                    {'period' in ev && 'timeRemainingSeconds' in ev && (
                      <div className="text-[10px] text-[var(--color-muted-foreground)]">
                        {formatQuarter(ev.period)} {formatTime(ev.timeRemainingSeconds)}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
