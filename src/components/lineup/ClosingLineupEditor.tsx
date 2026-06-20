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
import { Button } from '@/components/ui/button'
import { SlotItem } from './SlotItem'

const CLOSING_LABELS = ['1', '2', '3', '4', '5']

interface ClosingLineupEditorProps {
  closingIds: string[]
  players: Map<string, Player>
  onReorder: (newIds: string[]) => void
  onRemove: (playerId: string) => void
  onAddSlot: () => void
}

export function ClosingLineupEditor({
  closingIds,
  players,
  onReorder,
  onRemove,
  onAddSlot,
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-medium text-[var(--color-foreground)]">
          Closing Lineup
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          5 slots · drag to reorder
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={closingIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {closingIds.map((id, i) => (
              <SlotItem
                key={id}
                id={id}
                player={players.get(id) ?? null}
                index={i}
                label={CLOSING_LABELS[i]}
                onRemove={() => onRemove(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {closingIds.length < 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-[var(--color-muted-foreground)]"
          onClick={onAddSlot}
        >
          <Plus className="size-4" />
          Add to closing lineup
        </Button>
      )}
    </div>
  )
}
