import type { TeamDirection } from '@/game/models/team'
import { Chip } from '@/components/shared/Chip'

const LABELS: Record<TeamDirection, string> = {
  contender: 'Contender',
  playoff_push: 'Playoff push',
  middle: 'Middle',
  retooling: 'Retool',
  rebuilding: 'Rebuild',
  tanking: 'Tank',
}

const VARIANTS: Record<TeamDirection, 'success' | 'info' | 'default' | 'warning' | 'danger'> = {
  contender: 'success',
  playoff_push: 'info',
  middle: 'default',
  retooling: 'warning',
  rebuilding: 'warning',
  tanking: 'danger',
}

export function TeamDirectionBadge({ direction }: { direction: TeamDirection }) {
  return (
    <Chip
      label={LABELS[direction]}
      variant={VARIANTS[direction]}
      size="sm"
    />
  )
}
