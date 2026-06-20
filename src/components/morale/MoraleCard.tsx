import { Link } from 'react-router-dom'
import type { Player } from '@/game/models/player'
import { Card, CardContent } from '@/components/ui/card'
import { FaceIndicator } from '@/components/shared/FaceIndicator'
import { Chip } from '@/components/shared/Chip'

export function MoraleAlertsCard({ players }: { players: Player[] }) {
  const alerts = players.filter(
    (p) => p.morale.happiness < 50 || p.morale.tradeRequestLevel >= 80,
  )

  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
          Morale Alerts
        </div>
        {alerts.length === 0 ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            <div className="text-emerald-500 font-medium">Team morale good</div>
            <div className="mt-1">No unhappy players</div>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((p) => (
              <Link
                key={p.id}
                to={`/player/${p.id}`}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <FaceIndicator value={p.morale.happiness} />
                <span className="text-sm">
                  {p.firstName} {p.lastName}
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  ({p.morale.happiness})
                </span>
                {p.morale.tradeRequestLevel >= 80 && (
                  <Chip label="Trade request" variant="danger" size="sm" />
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
