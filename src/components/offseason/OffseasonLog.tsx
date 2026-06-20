import type { OffseasonEvent } from '@/game/models/offseason'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OffseasonLogProps {
  events: OffseasonEvent[]
}

export function OffseasonLog({ events }: OffseasonLogProps) {
  const sorted = [...events].reverse().slice(0, 20)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Offseason log</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No events yet.</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((e) => (
              <li key={e.id} className="text-sm border-b border-[var(--color-line)] pb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {e.date}
                </span>
                <div className="font-medium">{e.headline}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
