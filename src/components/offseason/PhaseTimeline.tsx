import type { LeaguePhase } from '@/game/models/league'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getNextPhase } from '@/game/league/offseasonEngine'

const PHASES: { id: LeaguePhase; label: string }[] = [
  { id: 'offseason', label: 'Offseason' },
  { id: 'draft', label: 'Draft' },
  { id: 'free_agency', label: 'Free Agency' },
  { id: 'preseason', label: 'Preseason' },
  { id: 'regular_season', label: 'Regular Season' },
]

interface PhaseTimelineProps {
  currentPhase: LeaguePhase
  onAdvance?: () => void
  advancing?: boolean
}

export function PhaseTimeline({ currentPhase, onAdvance, advancing }: PhaseTimelineProps) {
  const next = getNextPhase(
    PHASES.some((p) => p.id === currentPhase) ? currentPhase : 'offseason',
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PHASES.map((phase, idx) => {
          const currentIdx = PHASES.findIndex((p) => p.id === currentPhase)
          const isActive = phase.id === currentPhase
          const isPast = currentIdx > idx
          return (
            <div key={phase.id} className="flex items-center gap-2">
              <div
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  isActive && 'bg-[var(--color-primary)] text-white',
                  isPast && !isActive && 'bg-[var(--color-surface-3)] text-[var(--color-foreground)]',
                  !isActive && !isPast && 'bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]',
                )}
              >
                {phase.label}
              </div>
              {idx < PHASES.length - 1 && (
                <span className="text-[var(--color-muted-foreground)]">→</span>
              )}
            </div>
          )
        })}
      </div>
      {next && onAdvance && (
        <Button onClick={onAdvance} disabled={advancing} size="sm">
          Advance to {PHASES.find((p) => p.id === next)?.label ?? next}
        </Button>
      )}
    </div>
  )
}
