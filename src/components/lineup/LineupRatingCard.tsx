import type { LineupRating } from '@/game/models/team'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DIMENSION_LABELS: Record<string, string> = {
  spacing: 'Spacing',
  shotCreation: 'Shot Creation',
  passing: 'Passing',
  rimPressure: 'Rim Pressure',
  perimeterDefense: 'Perimeter D',
  interiorDefense: 'Interior D',
  rebounding: 'Rebounding',
  transition: 'Transition',
  benchBalance: 'Bench Balance',
  size: 'Size',
  switchability: 'Switchability',
}

function ratingColor(value: number): string {
  if (value >= 80) return 'text-emerald-500'
  if (value >= 65) return 'text-sky-500'
  if (value >= 50) return 'text-amber-500'
  return 'text-red-500'
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-3)]">
      <div
        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

interface LineupRatingCardProps {
  rating: LineupRating
}

export function LineupRatingCard({ rating }: LineupRatingCardProps) {
  const dimensions = Object.entries(DIMENSION_LABELS).filter(
    ([key]) => key in rating,
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display">Lineup Rating</CardTitle>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-display font-bold ${ratingColor(rating.overall)}`}>
              {Math.round(rating.overall)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Overall
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {dimensions.map(([key, label]) => {
            const value = rating[key as keyof LineupRating] as number
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 text-xs text-[var(--color-muted-foreground)] shrink-0">
                  {label}
                </span>
                <Bar value={value} />
                <span className={`w-8 text-right text-xs font-mono ${ratingColor(value)}`}>
                  {Math.round(value)}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
