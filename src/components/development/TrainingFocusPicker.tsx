import type { TrainingFocus } from '@/game/models/training'
import { TRAINING_FOCUS_LABELS } from '@/game/models/training'
import { cn } from '@/lib/utils'

const FOCUSES: TrainingFocus[] = [
  'balanced',
  'shooting',
  'defense',
  'playmaking',
  'strength',
  'conditioning',
  'rehab',
]

export function TrainingFocusPicker({
  value,
  onChange,
  compact = false,
}: {
  value: TrainingFocus
  onChange: (focus: TrainingFocus) => void
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', compact && 'gap-1')}>
      {FOCUSES.map((focus) => (
        <button
          key={focus}
          type="button"
          onClick={() => onChange(focus)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-xs transition-colors',
            value === focus
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
              : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/40',
            compact && 'px-2 py-1',
          )}
        >
          {TRAINING_FOCUS_LABELS[focus]}
        </button>
      ))}
    </div>
  )
}
