import { Loader2, X } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

export function SimProgressOverlay() {
  const simProgress = useGameStore((s) => s.simProgress)
  const cancelSimulation = useGameStore((s) => s.cancelSimulation)

  if (!simProgress) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="size-5 animate-spin text-[var(--color-primary)]" />
          <div className="font-display text-base">Simulating...</div>
        </div>

        {simProgress.currentMatchup && (
          <div className="text-sm text-[var(--color-muted-foreground)] mb-3 truncate">
            {simProgress.currentMatchup}
          </div>
        )}

        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {simProgress.current} / {simProgress.total} games
          </span>
          <span className="font-mono text-[var(--color-primary)]">
            {Math.round(simProgress.percentage)}%
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${simProgress.percentage}%` }}
          />
        </div>

        <button
          onClick={cancelSimulation}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <X className="size-3.5" />
          Cancel
        </button>
      </div>
    </div>
  )
}
