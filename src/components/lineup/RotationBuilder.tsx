import { useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState } from 'react'
import type { Player } from '@/game/models/player'
import type { LineupSettings } from '@/game/models/team'
import {
  getAvailablePlayerIds,
  STARTER_SLOT_COUNT,
} from '@/game/management/rotationActions'
import type { RotationSection } from '@/game/management/rotationActions'
import { AvailablePlayersPool, POOL_DROP_ID } from './AvailablePlayersPool'
import { StarterSlotsPanel, starterSlotId } from './StarterSlotsPanel'
import { BenchPanel, BENCH_DROP_ID } from './BenchPanel'
import { RotationPlayerRow } from './RotationPlayerRow'

interface RotationBuilderProps {
  lineup: LineupSettings
  roster: string[]
  players: Map<string, Player>
  onMinutesChange: (playerId: string, minutes: number) => void
  onRemoveFromRotation: (playerId: string) => void
  onMovePlayer: (
    playerId: string,
    from: RotationSection,
    to: RotationSection,
    index?: number,
  ) => void
  onAssignPlayer: (
    playerId: string,
    dest: 'starter' | 'bench',
    index?: number,
  ) => void
  onReorderBench: (benchIds: string[]) => void
  onForceIncludeChange: (playerId: string, force: boolean) => void
  onOpenPicker: (
    section: 'starters' | 'bench',
    index?: number,
  ) => void
}

function getPlayerSection(
  playerId: string,
  lineup: LineupSettings,
): RotationSection {
  if (lineup.starters.includes(playerId)) return 'starter'
  if (lineup.bench.includes(playerId)) return 'bench'
  return 'pool'
}

export function RotationBuilder({
  lineup,
  roster,
  players,
  onMinutesChange,
  onRemoveFromRotation,
  onMovePlayer,
  onAssignPlayer,
  onReorderBench,
  onForceIncludeChange,
  onOpenPicker,
}: RotationBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const availableIds = getAvailablePlayerIds(roster, lineup)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handlePoolPlayerClick = useCallback(
    (playerId: string) => {
      const emptyStarterSlot = lineup.starters.length < STARTER_SLOT_COUNT
        ? lineup.starters.length
        : -1
      if (emptyStarterSlot >= 0) {
        onAssignPlayer(playerId, 'starter', emptyStarterSlot)
      } else {
        onAssignPlayer(playerId, 'bench')
      }
    },
    [lineup.starters.length, onAssignPlayer],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return

      const playerId = active.id as string
      const overId = over.id as string
      const from = getPlayerSection(playerId, lineup)

      if (overId === POOL_DROP_ID) {
        if (from !== 'pool') onMovePlayer(playerId, from, 'pool')
        return
      }

      if (overId === BENCH_DROP_ID) {
        onMovePlayer(playerId, from, 'bench')
        return
      }

      if (overId.startsWith('starter-')) {
        const slot = Number.parseInt(overId.replace('starter-', ''), 10)
        onMovePlayer(playerId, from, 'starter', slot)
        return
      }

      if (lineup.bench.includes(overId)) {
        const index = lineup.bench.indexOf(overId)
        if (from === 'bench' && playerId !== overId) {
          const oldIndex = lineup.bench.indexOf(playerId)
          if (oldIndex !== -1 && index !== -1) {
            onReorderBench(arrayMove(lineup.bench, oldIndex, index))
          }
        } else {
          onMovePlayer(playerId, from, 'bench', index)
        }
        return
      }

      if (lineup.starters.includes(overId)) {
        const slot = lineup.starters.indexOf(overId)
        onMovePlayer(playerId, from, 'starter', slot)
      }
    },
    [lineup, onMovePlayer, onReorderBench],
  )

  const activePlayer = activeId ? players.get(activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <AvailablePlayersPool
          playerIds={availableIds}
          players={players}
          onPlayerClick={handlePoolPlayerClick}
        />

        <div className="space-y-6">
          <StarterSlotsPanel
            starterIds={lineup.starters}
            players={players}
            targetMinutes={lineup.targetMinutes}
            forceInclude={lineup.forceInclude}
            onMinutesChange={onMinutesChange}
            onRemove={onRemoveFromRotation}
            onEmptySlotClick={(slot) => onOpenPicker('starters', slot)}
            onPlayerClick={(_id, slot) => onOpenPicker('starters', slot)}
            onForceIncludeChange={onForceIncludeChange}
          />

          <BenchPanel
            benchIds={lineup.bench}
            players={players}
            targetMinutes={lineup.targetMinutes}
            forceInclude={lineup.forceInclude}
            onMinutesChange={onMinutesChange}
            onRemove={onRemoveFromRotation}
            onPlayerClick={() => onOpenPicker('bench')}
            onAddClick={() => onOpenPicker('bench')}
            onForceIncludeChange={onForceIncludeChange}
          />
        </div>
      </div>

      <DragOverlay>
        {activePlayer ? (
          <RotationPlayerRow player={activePlayer} draggable={false} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export { starterSlotId, BENCH_DROP_ID, POOL_DROP_ID }
