import type { PlayerHealth } from '@/game/models/player'
import { Chip } from '@/components/shared/Chip'

const STATUS_LABELS: Record<PlayerHealth['status'], string> = {
  healthy: 'Healthy',
  day_to_day: 'Day-to-day',
  short_term: 'Out',
  long_term: 'Out',
  season_ending: 'Season-ending',
}

const STATUS_VARIANT: Record<
  PlayerHealth['status'],
  'success' | 'warning' | 'danger' | 'default'
> = {
  healthy: 'success',
  day_to_day: 'warning',
  short_term: 'danger',
  long_term: 'danger',
  season_ending: 'danger',
}

export function HealthBadge({ health }: { health: PlayerHealth }) {
  return (
    <Chip
      label={STATUS_LABELS[health.status]}
      variant={STATUS_VARIANT[health.status]}
      size="sm"
    />
  )
}
