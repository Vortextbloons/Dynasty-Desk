import { Scale } from 'lucide-react'
import { TOTAL_ROTATION_MINUTES } from '@/game/management/rotationActions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MinutesTotalBarProps {
  totalMinutes: number
  onBalance: () => void
}

export function MinutesTotalBar({ totalMinutes, onBalance }: MinutesTotalBarProps) {
  const diff = totalMinutes - TOTAL_ROTATION_MINUTES
  const pct = Math.min(100, Math.max(0, (totalMinutes / TOTAL_ROTATION_MINUTES) * 100))
  const isValid = Math.abs(diff) <= 2

  return (
    <div className="rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Rotation minutes
          </div>
          <div
            className={cn(
              'font-display text-lg font-medium',
              isValid
                ? 'text-[var(--color-foreground)]'
                : 'text-amber-500',
            )}
          >
            {totalMinutes} / {TOTAL_ROTATION_MINUTES}
            {!isValid && (
              <span className="ml-2 text-sm font-normal text-amber-500/80">
                ({diff > 0 ? '+' : ''}{diff})
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onBalance}>
          <Scale className="size-4" />
          Balance minutes
        </Button>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isValid ? 'bg-[var(--color-primary)]' : 'bg-amber-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
