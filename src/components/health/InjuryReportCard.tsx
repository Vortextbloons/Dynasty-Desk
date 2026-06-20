import { Link } from 'react-router-dom'
import type { Player } from '@/game/models/player'
import { Card, CardContent } from '@/components/ui/card'
import { HealthBadge } from '@/components/health/HealthBadge'

export function InjuryReportCard({ players }: { players: Player[] }) {
  const injured = players.filter((p) => p.health.status !== 'healthy')

  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
          Injury Report
        </div>
        {injured.length === 0 ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            <div className="text-emerald-500 font-medium">All healthy</div>
            <div className="mt-1">No injuries to report</div>
          </div>
        ) : (
          <div className="space-y-2">
            {injured.map((p) => (
              <Link
                key={p.id}
                to={`/player/${p.id}`}
                className="flex items-center justify-between gap-2 hover:opacity-80"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <HealthBadge health={p.health} />
                  <span className="text-sm truncate">
                    {p.firstName} {p.lastName}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--color-muted-foreground)] shrink-0">
                  {p.health.gamesRemaining > 0
                    ? `${p.health.gamesRemaining}g`
                    : p.health.injuryDescription ?? '—'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
