import { Link } from 'react-router-dom'
import { PlayerHeadshot, type PlayerHeadshotSource } from '@/components/player/PlayerHeadshot'
import type { StaticTeam } from '@/game/models'
import { cn } from '@/lib/utils'

type TeamColorSource = Pick<StaticTeam, 'colors'>

export interface PlayerListItemProps {
  player: PlayerHeadshotSource & { id?: string }
  team?: TeamColorSource | null
  size?: number
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  linkTo?: string
  className?: string
  nameClassName?: string
}

export function PlayerListItem({
  player,
  team,
  size = 32,
  subtitle,
  trailing,
  onClick,
  disabled = false,
  selected = false,
  linkTo,
  className,
  nameClassName,
}: PlayerListItemProps) {
  const content = (
    <>
      <PlayerHeadshot player={player} team={team} size={size} />
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-medium leading-tight', nameClassName)}>
          {player.firstName} {player.lastName}
        </div>
        {subtitle && (
          <div className="text-[10px] text-[var(--color-muted-foreground)]">{subtitle}</div>
        )}
      </div>
      {trailing}
    </>
  )

  const baseClass = cn(
    'flex items-center gap-3 w-full text-left transition-colors',
    selected && 'bg-[var(--color-surface-2)]',
    disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--color-surface-2)]',
    className,
  )

  if (linkTo && !disabled) {
    return (
      <Link to={linkTo} className={cn(baseClass, 'group')}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={baseClass}
      >
        {content}
      </button>
    )
  }

  return <div className={baseClass}>{content}</div>
}
