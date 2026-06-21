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

const BENCH_SOFT_CAP = 15

interface BenchEditorProps {
  benchIds: string[]
  players: Map<string, Player>
  targetMinutes: Record<string, number>
  onReorder: (newIds: string[]) => void
  onMinutesChange: (playerId: string, minutes: number) => void
  onRemove: (playerId: string) => void
  onAddSlot: () => void
}

export function BenchEditor({
  benchIds,
  players,
  targetMinutes,
  onReorder,
  onMinutesChange,
  onRemove,
  onAddSlot,
}: BenchEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = benchIds.indexOf(active.id as string)
    const newIndex = benchIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const next = [...benchIds]
    next.splice(oldIndex, 1)
    next.splice(newIndex, 0, active.id as string)
    onReorder(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-medium text-[var(--color-foreground)]">
          Bench
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {benchIds.length}/{BENCH_SOFT_CAP} · drag to reorder
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={benchIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {benchIds.map((id, i) => (
              <SlotItem
                key={id}
                id={id}
                player={players.get(id) ?? null}
                index={i}
                minutes={targetMinutes[id]}
                onMinutesChange={(m) => onMinutesChange(id, m)}
                onRemove={() => onRemove(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full text-[var(--color-muted-foreground)]"
        onClick={onAddSlot}
      >
        <Plus className="size-4" />
        Add to bench
      </Button>
    </div>
  )
}
