import { Link } from 'react-router-dom'
import type { Player } from '@/game/models/player'
import { Card, CardContent } from '@/components/ui/card'
import { FaceIndicator } from '@/components/shared/FaceIndicator'
import { Chip } from '@/components/shared/Chip'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { SectionLabel } from '@/components/shared/SectionLabel'

export function MoraleAlertsCard({ players }: { players: Player[] }) {
  const alerts = players.filter(
    (p) => p.morale.happiness < 50 || p.morale.tradeRequestLevel >= 80,
  )

  return (
    <Card>
      <CardContent className="p-5">
        <SectionLabel className="mb-3">Morale Alerts</SectionLabel>
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
                <PlayerListItem
                  player={p}
                  size={28}
                  className="flex-1 min-w-0 pointer-events-none"
                  trailing={
                    <>
                      <FaceIndicator value={p.morale.happiness} />
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        ({p.morale.happiness})
                      </span>
                      {p.morale.tradeRequestLevel >= 80 && (
                        <Chip label="Trade request" variant="danger" size="sm" />
                      )}
                    </>
                  }
                />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
