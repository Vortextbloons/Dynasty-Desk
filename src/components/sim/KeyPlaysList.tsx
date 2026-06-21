import type { SimEvent } from '@/game/models'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { describeSimEvent, formatQuarter, formatClock } from '@/game/sim/simEventFormat'

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
              const desc = describeSimEvent(ev, playerName)
              if (!desc) return null
              return (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 font-mono text-[10px] text-[var(--color-muted-foreground)] pt-0.5">
                    {ev.type === 'endOfPeriod'
                      ? formatQuarter(ev.period > 0 ? ev.period : 1)
                      : 'period' in ev && 'timeRemainingSeconds' in ev
                        ? `${formatQuarter(ev.period)} ${formatClock(ev.timeRemainingSeconds)}`
                        : '—'}
                  </span>
                  <span>{desc}</span>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
