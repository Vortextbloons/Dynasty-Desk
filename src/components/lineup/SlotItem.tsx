import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import type { Player } from '@/game/models/player'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { Chip } from '@/components/shared/Chip'
import { cn } from '@/lib/utils'

interface SlotItemProps {
  id: string
  player: Player | null
  index: number
  label?: string
  minutes?: number
  onMinutesChange?: (minutes: number) => void
  onRemove?: () => void
  onClickSlot?: () => void
  disabled?: boolean
}

export function SlotItem({
  id,
  player,
  index,
  label,
  minutes,
  onMinutesChange,
  onRemove,
  onClickSlot,
  disabled = false,
}: SlotItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-3 py-2 transition-colors',
        isDragging && 'z-10 shadow-lg border-[var(--color-primary)]',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span className="w-5 text-center text-xs font-mono text-[var(--color-muted-foreground)]">
        {label ?? `${index + 1}`}
      </span>

      {player ? (
        <>
          <PlayerHeadshot player={player} size={28} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {player.firstName} {player.lastName}
            </div>
          </div>
          <Chip label={player.position} size="sm" />
          <span className="font-mono text-xs text-[var(--color-muted-foreground)] w-5 text-right">
            {player.ratings.overall}
          </span>
        </>
      ) : (
        <button
          type="button"
          onClick={onClickSlot}
          className="flex-1 text-left text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          Click to select player
        </button>
      )}

      {minutes !== undefined && onMinutesChange && (
        <input
          type="number"
          value={minutes}
          onChange={(e) => onMinutesChange(Number(e.target.value))}
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
