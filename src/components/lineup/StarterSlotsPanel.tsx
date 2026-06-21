import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import type { Player } from '@/game/models/player'
import { isInjured } from '@/game/management/rotationValidator'
import { STARTER_SLOT_COUNT } from '@/game/management/rotationActions'
import { RotationPlayerRow } from './RotationPlayerRow'
import { cn } from '@/lib/utils'

interface StarterSlotsPanelProps {
  starterIds: string[]
  players: Map<string, Player>
  targetMinutes: Record<string, number>
  forceInclude?: Record<string, boolean>
  onMinutesChange: (playerId: string, minutes: number) => void
  onRemove: (playerId: string) => void
  onEmptySlotClick: (slotIndex: number) => void
  onPlayerClick: (playerId: string, slotIndex: number) => void
  onForceIncludeChange: (playerId: string, force: boolean) => void
}

export function starterSlotId(index: number): string {
  return `starter-${index}`
}

export function StarterSlotsPanel({
  starterIds,
  players,
  targetMinutes,
  forceInclude = {},
  onMinutesChange,
  onRemove,
  onEmptySlotClick,
  onPlayerClick,
  onForceIncludeChange,
}: StarterSlotsPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-medium text-[var(--color-foreground)]">
          Starters
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {starterIds.length}/{STARTER_SLOT_COUNT} · drag or click
        </span>
      </div>
      <div className="space-y-1">
        {Array.from({ length: STARTER_SLOT_COUNT }, (_, slotIndex) => {
          const playerId = starterIds[slotIndex]
          const player = playerId ? players.get(playerId) : null
          return (
            <StarterSlot
              key={starterSlotId(slotIndex)}
              slotIndex={slotIndex}
              player={player ?? null}
              targetMinutes={targetMinutes}
              forceInclude={playerId ? forceInclude[playerId] : false}
              onMinutesChange={onMinutesChange}
              onRemove={onRemove}
              onEmptySlotClick={onEmptySlotClick}
              onPlayerClick={onPlayerClick}
              onForceIncludeChange={onForceIncludeChange}
            />
          )
        })}
      </div>
    </div>
  )
}

function StarterSlot({
  slotIndex,
  player,
  targetMinutes,
  forceInclude,
  onMinutesChange,
  onRemove,
  onEmptySlotClick,
  onPlayerClick,
  onForceIncludeChange,
}: {
  slotIndex: number
  player: Player | null
  targetMinutes: Record<string, number>
  forceInclude?: boolean
  onMinutesChange: (playerId: string, minutes: number) => void
  onRemove: (playerId: string) => void
  onEmptySlotClick: (slotIndex: number) => void
  onPlayerClick: (playerId: string, slotIndex: number) => void
  onForceIncludeChange: (playerId: string, force: boolean) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: starterSlotId(slotIndex),
  })

  if (player) {
    return (
      <div ref={setNodeRef}>
        <RotationPlayerRow
          player={player}
          minutes={targetMinutes[player.id] ?? 0}
          onMinutesChange={(m) => onMinutesChange(player.id, m)}
          onRemove={() => onRemove(player.id)}
          onClick={() => onPlayerClick(player.id, slotIndex)}
          injured={isInjured(player)}
          forceInclude={forceInclude}
          onForceIncludeChange={(force) => onForceIncludeChange(player.id, force)}
        />
      </div>
    )
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onEmptySlotClick(slotIndex)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)]',
        isOver && 'border-[var(--color-primary)] bg-[var(--color-primary)]/5',
      )}
    >
      <Plus className="size-4 shrink-0" />
      <span>Drop or click to add starter</span>
    </button>
  )
}
