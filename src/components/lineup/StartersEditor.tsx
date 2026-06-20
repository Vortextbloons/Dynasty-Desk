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

interface StartersEditorProps {
  starterIds: string[]
  players: Map<string, Player>
  targetMinutes: Record<string, number>
  onReorder: (newIds: string[]) => void
  onMinutesChange: (playerId: string, minutes: number) => void
  onRemove: (playerId: string) => void
  onAddSlot: () => void
}

const SLOT_LABELS = ['PG', 'SG', 'SF', 'PF', 'C']

export function StartersEditor({
  starterIds,
  players,
  targetMinutes,
  onReorder,
  onMinutesChange,
  onRemove,
  onAddSlot,
}: StartersEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = starterIds.indexOf(active.id as string)
    const newIndex = starterIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const next = [...starterIds]
    next.splice(oldIndex, 1)
    next.splice(newIndex, 0, active.id as string)
    onReorder(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-medium text-[var(--color-foreground)]">
          Starters
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
          items={starterIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {starterIds.map((id, i) => (
              <SlotItem
                key={id}
                id={id}
                player={players.get(id) ?? null}
                index={i}
                label={SLOT_LABELS[i] ?? `${i + 1}`}
                minutes={targetMinutes[id]}
                onMinutesChange={(m) => onMinutesChange(id, m)}
                onRemove={() => onRemove(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {starterIds.length < 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-[var(--color-muted-foreground)]"
          onClick={onAddSlot}
        >
          <Plus className="size-4" />
          Add starter
        </Button>
      )}
    </div>
  )
}
