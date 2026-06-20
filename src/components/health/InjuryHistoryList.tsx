import type { Player } from '@/game/models/player'
import { HealthBadge } from '@/components/health/HealthBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function InjuryHistoryList({ player }: { player: Player }) {
  const { health } = player
  const history = [...health.injuryHistory].reverse()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <HealthBadge health={health} />
          {health.injuryDescription && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {health.injuryDescription}
            </p>
          )}
          {health.status !== 'healthy' && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Expected return: {health.gamesRemaining} games ({health.daysRemaining} days)
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Injury History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No prior injuries.</p>
          ) : (
            <div className="space-y-2">
              {history.map((inj) => (
                <div
                  key={inj.id}
                  className="flex justify-between text-sm border-b border-[var(--color-line-soft)] pb-2 last:border-0"
                >
                  <div>
                    <div className="font-medium capitalize">{inj.bodyPart}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {inj.date} · {inj.severity.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {inj.daysOut}d
                    {inj.recoveredAt ? ' · recovered' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
