import { Zap, Clock } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'
import type { SimSpeed } from '@/game/models'

const OPTIONS: { value: SimSpeed; label: string; icon: typeof Zap }[] = [
  { value: 'instant', label: 'Instant', icon: Zap },
  { value: 'normal', label: 'Normal', icon: Clock },
]

export function SimSpeedToggle() {
  const save = useGameStore((s) => s.save)
  const setSimSpeed = useGameStore((s) => s.setSimSpeed)
  if (!save) return null
  const current =
    save.settings.simSpeed === 'slow' ||
    save.settings.simSpeed === 'balanced' ||
    save.settings.simSpeed === 'fast'
      ? 'normal'
      : save.settings.simSpeed

  return (
    <div className="inline-flex items-center rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = current === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSimSpeed(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-[var(--color-surface-3)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
            aria-pressed={active}
          >
            <Icon className="size-3.5" />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
