import { Link } from 'react-router-dom'
import { PlayerHeadshot, type PlayerHeadshotSource } from '@/components/player/PlayerHeadshot'
import type { StaticTeam } from '@/game/models'
import { cn } from '@/lib/utils'

type TeamColorSource = Pick<StaticTeam, 'colors'>

export interface PlayerTableCellProps {
  player: PlayerHeadshotSource & { id: string }
  team?: TeamColorSource | null
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  size?: number
  linkToPlayer?: boolean
  className?: string
}

export function PlayerTableCell({
  player,
  team,
  subtitle,
  badge,
  size = 36,
  linkToPlayer = true,
  className,
}: PlayerTableCellProps) {
  const inner = (
    <>
      <PlayerHeadshot player={player} team={team} size={size} />
      <div className="min-w-0">
        <div
          className={cn(
            'font-display text-sm',
            linkToPlayer && 'group-hover:text-[var(--color-primary)] transition-colors',
          )}
        >
          {player.firstName} {player.lastName}
        </div>
        {subtitle && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {subtitle}
          </div>
        )}
      </div>
      {badge}
    </>
  )

  if (linkToPlayer) {
    return (
      <Link
        to={`/player/${player.id}`}
        className={cn('flex items-center gap-3 group', className)}
      >
        {inner}
      </Link>
    )
  }

  return <div className={cn('flex items-center gap-3', className)}>{inner}</div>
}
