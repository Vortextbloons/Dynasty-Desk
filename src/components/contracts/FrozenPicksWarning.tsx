import type { DraftPick } from '@/game/models/draft'
import { Card, CardContent } from '@/components/ui/card'
import { Chip } from '@/components/shared/Chip'

interface FrozenPicksWarningProps {
  picks: DraftPick[]
}

export function FrozenPicksWarning({ picks }: FrozenPicksWarningProps) {
  if (picks.length === 0) return null

  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.22em] text-amber-500">
            Frozen picks
          </div>
          <Chip label={`${picks.length} locked`} variant="warning" size="sm" />
        </div>
        <div className="text-[10px] text-[var(--color-muted-foreground)]">
          2nd-apron team rule — these 1st-round picks cannot be traded until the listed season.
        </div>
        <div className="space-y-1">
          {picks.map((pick) => (
            <div
              key={pick.id}
              className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-xs"
            >
              <span className="font-mono">
                {pick.season} • Rd {pick.round} • #{pick.pickNumber}
              </span>
              <Chip label="FROZEN" variant="warning" size="sm" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
