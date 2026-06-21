import { Link } from 'react-router-dom'
import type { Player } from '@/game/models/player'
import { Card, CardContent } from '@/components/ui/card'
import { HealthBadge } from '@/components/health/HealthBadge'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { SectionLabel } from '@/components/shared/SectionLabel'

export function InjuryReportCard({ players }: { players: Player[] }) {
  const injured = players.filter((p) => p.health.status !== 'healthy')

  return (
    <Card>
      <CardContent className="p-5">
        <SectionLabel className="mb-3">Injury Report</SectionLabel>
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
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <PlayerListItem
                    player={p}
                    size={28}
                    className="pointer-events-none flex-1 min-w-0"
                    nameClassName="truncate"
                  />
                  <HealthBadge health={p.health} />
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
