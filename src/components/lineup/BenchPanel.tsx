import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import type { Player } from '@/game/models/player'
import { isInjured } from '@/game/management/rotationValidator'
import { BENCH_SOFT_CAP } from '@/game/management/rotationActions'
import { RotationPlayerRow } from './RotationPlayerRow'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const BENCH_DROP_ID = 'bench'

interface BenchPanelProps {
  benchIds: string[]
  players: Map<string, Player>
  targetMinutes: Record<string, number>
  forceInclude?: Record<string, boolean>
  onMinutesChange: (playerId: string, minutes: number) => void
  onRemove: (playerId: string) => void
  onPlayerClick: (playerId: string) => void
  onAddClick: () => void
  onForceIncludeChange: (playerId: string, force: boolean) => void
}

export function BenchPanel({
  benchIds,
  players,
  targetMinutes,
  forceInclude = {},
  onMinutesChange,
  onRemove,
  onPlayerClick,
  onAddClick,
  onForceIncludeChange,
}: BenchPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: BENCH_DROP_ID })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-medium text-[var(--color-foreground)]">
          Bench
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {benchIds.length}/{BENCH_SOFT_CAP} · drag or click
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[80px] rounded-md border border-[var(--color-line-soft)] p-1 transition-colors',
          isOver && 'border-[var(--color-primary)] bg-[var(--color-primary)]/5',
        )}
      >
        <SortableContext items={benchIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {benchIds.map((id, index) => {
              const player = players.get(id)
              if (!player) return null
              return (
                <SortableBenchRow
                  key={`bench-${index}-${id}`}
                  player={player}
                  minutes={targetMinutes[id] ?? 0}
                  forceInclude={forceInclude[id]}
                  onMinutesChange={(m) => onMinutesChange(id, m)}
                  onRemove={() => onRemove(id)}
                  onClick={() => onPlayerClick(id)}
                  onForceIncludeChange={(force) => onForceIncludeChange(id, force)}
                />
              )
            })}
          </div>
        </SortableContext>
        {benchIds.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
            Drop players here for bench minutes
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full text-[var(--color-muted-foreground)]"
        onClick={onAddClick}
        disabled={benchIds.length >= BENCH_SOFT_CAP}
      >
        <Plus className="size-4" />
        Add to bench
      </Button>
    </div>
  )
}

function SortableBenchRow({
  player,
  minutes,
  forceInclude,
  onMinutesChange,
  onRemove,
  onClick,
  onForceIncludeChange,
}: {
  player: Player
  minutes: number
  forceInclude?: boolean
  onMinutesChange: (minutes: number) => void
  onRemove: () => void
  onClick: () => void
  onForceIncludeChange: (force: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2',
        isDragging && 'z-10 opacity-90',
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
      <div className="flex-1 min-w-0">
        <RotationPlayerRow
          player={player}
          minutes={minutes}
          onMinutesChange={onMinutesChange}
          onRemove={onRemove}
          onClick={onClick}
          injured={isInjured(player)}
          forceInclude={forceInclude}
          onForceIncludeChange={onForceIncludeChange}
          draggable={false}
        />
      </div>
    </div>
  )
}
