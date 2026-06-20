import { cn } from '@/lib/utils'

export function FatigueBar({ fatigue }: { fatigue: number }) {
  const level = Math.max(0, Math.min(100, fatigue))
  const color =
    level >= 75
      ? 'bg-red-500'
      : level >= 50
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${level}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-[var(--color-muted-foreground)] w-6">
        {Math.round(level)}
      </span>
    </div>
  )
}
