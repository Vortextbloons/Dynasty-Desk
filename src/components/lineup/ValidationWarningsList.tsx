import { AlertTriangle, Wrench } from 'lucide-react'
import type { RotationWarning } from '@/game/models/team'
import { Button } from '@/components/ui/button'

interface WarningEntry {
  code: RotationWarning
  playerIds?: string[]
  message: string
}

const WARNING_LABELS: Record<RotationWarning, string> = {
  not_five_starters: 'Need 5 starters',
  not_five_closing: 'Need 5 closing players',
  minutes_not_240: 'Minutes ≠ 240',
  duplicate_player: 'Duplicate player',
  injured_player_in_rotation: 'Injured player',
  injured_player_force_included: 'Injured (force-included)',
  player_not_on_roster: 'Not on roster',
  no_ball_handler: 'No ball handler',
  no_center: 'No center/PF',
  bench_too_large: 'Bench too large',
}

export function warningMessage(code: RotationWarning): string {
  return WARNING_LABELS[code] ?? code
}

interface ValidationWarningsListProps {
  warnings: WarningEntry[]
  onFix?: (code: RotationWarning) => void
}

export function ValidationWarningsList({
  warnings,
  onFix,
}: ValidationWarningsListProps) {
  if (warnings.length === 0) return null

  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <div
          key={`${w.code}-${i}`}
          className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
        >
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
          <span className="flex-1 text-amber-500">
            <span className="font-medium">{WARNING_LABELS[w.code] ?? w.code}</span>
            {w.message && w.message !== (WARNING_LABELS[w.code] ?? w.code) && (
              <span className="ml-1.5 text-amber-500/70">{w.message}</span>
            )}
          </span>
          {onFix && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-500 hover:text-amber-400"
              onClick={() => onFix(w.code)}
            >
              <Wrench className="size-3" />
              Fix
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
