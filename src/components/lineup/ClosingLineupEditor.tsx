import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { Player } from '@/game/models/player'
import { STARTER_SLOT_COUNT, uniquePlayerIds } from '@/game/management/rotationActions'
import { SlotItem } from './SlotItem'

interface ClosingLineupEditorProps {
  closingIds: string[]
  players: Map<string, Player>
  onReorder: (newIds: string[]) => void
  onRemove: (playerId: string) => void
  onEmptySlotClick: (slotIndex: number) => void
  onPlayerClick: (slotIndex: number) => void
}

export function ClosingLineupEditor({
  closingIds,
  players,
  onReorder,
  onRemove,
  onEmptySlotClick,
  onPlayerClick,
}: ClosingLineupEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = closingIds.indexOf(active.id as string)
    const newIndex = closingIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const next = [...closingIds]
    next.splice(oldIndex, 1)
    next.splice(newIndex, 0, active.id as string)
    onReorder(next)
  }

  return (
    <div className="rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-display font-medium text-[var(--color-foreground)]">
            Closing Lineup
          </h3>
          <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
            Five players for clutch minutes — must be in your rotation
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {closingIds.length}/{STARTER_SLOT_COUNT}
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={uniquePlayerIds(closingIds)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {Array.from({ length: STARTER_SLOT_COUNT }, (_, i) => {
              const id = closingIds[i]
              const player = id ? players.get(id) ?? null : null
              if (player && id) {
                return (
                  <SlotItem
                    key={`closing-slot-${i}`}
                    id={id}
                    player={player}
                    index={i}
                    label={`${i + 1}`}
                    onClickSlot={() => onPlayerClick(i)}
                    onRemove={() => onRemove(id)}
                  />
                )
              }
              return (
                <button
                  key={`empty-${i}`}
                  type="button"
                  onClick={() => onEmptySlotClick(i)}
                  className="flex items-center gap-2 rounded-md border border-dashed border-[var(--color-line-soft)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  <Plus className="size-4" />
                  <span>Click to add closing player</span>
                </button>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
