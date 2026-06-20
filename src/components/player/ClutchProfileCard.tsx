import type { Player } from '@/game/models/player'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ClutchProfileCard({ player }: { player: Player }) {
  const { clutch, consistency } = player.ratings
  const gp = Math.max(1, player.seasonStats.gamesPlayed)
  const ppg = player.seasonStats.points / gp

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Clutch Ratings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <RatingMeter label="Clutch" value={clutch} />
          <RatingMeter label="Consistency" value={consistency} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Late-game context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
          <p>
            Clutch and consistency ratings drive performance in the final five minutes when the
            margin is five points or fewer.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em]">Season PPG</div>
              <div className="font-display text-xl text-[var(--color-foreground)]">
                {ppg.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em]">Morale</div>
              <div className="font-display text-xl text-[var(--color-foreground)]">
                {player.morale.happiness}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RatingMeter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--color-muted-foreground)]">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}
