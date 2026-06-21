import { FastForward } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

export function LiveGameSimOverlay() {
  const liveGameSim = useGameStore((s) => s.liveGameSim)

  if (!liveGameSim) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FastForward className="size-4 text-[var(--color-primary)] animate-pulse" />
            Fast-forward sim
          </div>
          <div className="font-mono text-sm text-[var(--color-muted-foreground)]">
            {liveGameSim.periodLabel} · {liveGameSim.clock}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-8">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Away
            </div>
            <div className="font-display text-lg">{liveGameSim.awayAbbr}</div>
          </div>
          <div className="flex items-center gap-3 font-display text-4xl tabular-nums">
            <span className="transition-all duration-200">{liveGameSim.awayScore}</span>
            <span className="text-lg text-[var(--color-muted-foreground)]">—</span>
            <span className="transition-all duration-200">{liveGameSim.homeScore}</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Home
            </div>
            <div className="font-display text-lg">{liveGameSim.homeAbbr}</div>
          </div>
        </div>

        <div className="border-t border-[var(--color-line-soft)] px-5 py-4 max-h-56 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-2">
            Play-by-play
          </div>
          {liveGameSim.playLines.length === 0 ? (
            <div className="text-sm text-[var(--color-muted-foreground)] italic">
              Tip-off...
            </div>
          ) : (
            <ul className="space-y-1.5">
              {liveGameSim.playLines.map((line) => (
                <li
                  key={line.id}
                  className={cn(
                    'flex items-start gap-2 text-sm',
                    line.isScoring && 'text-[var(--color-primary)] font-medium',
                  )}
                >
                  <span className="shrink-0 font-mono text-[10px] text-[var(--color-muted-foreground)] pt-0.5">
                    {line.periodLabel} {line.clock}
                  </span>
                  <span>{line.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
