import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import type { Player } from '@/game/models/player'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { Chip } from '@/components/shared/Chip'
import { cn } from '@/lib/utils'

interface RotationPlayerRowProps {
  player: Player
  minutes?: number
  onMinutesChange?: (minutes: number) => void
  onRemove?: () => void
  onClick?: () => void
  injured?: boolean
  forceInclude?: boolean
  onForceIncludeChange?: (force: boolean) => void
  draggable?: boolean
  className?: string
}

export function RotationPlayerRow({
  player,
  minutes,
  onMinutesChange,
  onRemove,
  onClick,
  injured = false,
  forceInclude = false,
  onForceIncludeChange,
  draggable = true,
  className,
}: RotationPlayerRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: player.id,
    disabled: !draggable,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-2 py-1.5 transition-colors',
        isDragging && 'z-10 shadow-lg border-[var(--color-primary)] opacity-90',
        injured && 'border-amber-500/40',
        className,
      )}
    >
      {draggable && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <PlayerListItem
          player={player}
          size={28}
          className="pointer-events-none"
          trailing={
            <>
              <Chip label={player.position} size="sm" />
              <span className="font-mono text-xs text-[var(--color-muted-foreground)] w-5 text-right">
                {player.ratings.overall}
              </span>
            </>
          }
        />
      </button>

      {injured && onForceIncludeChange && (
        <label className="flex items-center gap-1 text-[10px] text-amber-500 shrink-0">
          <input
            type="checkbox"
            checked={forceInclude}
            onChange={(e) => onForceIncludeChange(e.target.checked)}
            className="size-3"
          />
          Force
        </label>
      )}

      {minutes !== undefined && onMinutesChange && (
        <input
          type="number"
          value={minutes}
          onChange={(e) => onMinutesChange(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          className="w-12 rounded border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-center text-xs font-mono text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          min={0}
          max={48}
        />
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-[var(--color-muted-foreground)] hover:text-red-500 transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
