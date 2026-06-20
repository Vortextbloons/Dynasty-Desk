import type { Player } from '@/game/models/player'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FaceIndicator } from '@/components/shared/FaceIndicator'
import { Chip } from '@/components/shared/Chip'

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--color-muted-foreground)]">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

export function MoraleDetailCard({ player }: { player: Player }) {
  const m = player.morale
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Morale Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <FaceIndicator value={m.happiness} showLabel />
            {m.tradeRequestLevel >= 80 && (
              <Chip label="Trade request" variant="danger" size="sm" />
            )}
          </div>
          <div className="grid gap-3">
            <Meter label="Happiness" value={m.happiness} />
            <Meter label="Role satisfaction" value={m.roleSatisfaction} />
            <Meter label="Team satisfaction" value={m.teamSatisfaction} />
            <Meter label="Trade request level" value={m.tradeRequestLevel} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
