import { useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Search } from 'lucide-react'
import type { Player } from '@/game/models/player'
import type { Position } from '@/game/models/position'
import { RotationPlayerRow } from './RotationPlayerRow'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

export const POOL_DROP_ID = 'pool'

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']

interface AvailablePlayersPoolProps {
  playerIds: string[]
  players: Map<string, Player>
  onPlayerClick: (playerId: string) => void
}

export function AvailablePlayersPool({
  playerIds,
  players,
  onPlayerClick,
}: AvailablePlayersPoolProps) {
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState<Position | null>(null)
  const { setNodeRef, isOver } = useDroppable({ id: POOL_DROP_ID })

  const filtered = useMemo(() => {
    let list = playerIds
      .map((id) => players.get(id))
      .filter((p): p is Player => Boolean(p))

    if (positionFilter) {
      list = list.filter(
        (p) =>
          p.position === positionFilter ||
          p.secondaryPositions?.includes(positionFilter),
      )
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q),
      )
    }

    return list.sort((a, b) => b.ratings.overall - a.ratings.overall)
  }, [playerIds, players, search, positionFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-medium text-[var(--color-foreground)]">
          Available
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {playerIds.length} players
        </span>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          placeholder="Search name or position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] pl-8 pr-3 py-1.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <button
          type="button"
          onClick={() => setPositionFilter(null)}
          className={cn(
            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
            positionFilter === null
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)]',
          )}
        >
          All
        </button>
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => setPositionFilter(pos === positionFilter ? null : pos)}
            className={cn(
              'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
              positionFilter === pos
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)]',
            )}
          >
            {pos}
          </button>
        ))}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'max-h-[420px] overflow-y-auto space-y-1 rounded-md border border-[var(--color-line-soft)] p-1 min-h-[120px] transition-colors',
          isOver && 'border-[var(--color-primary)] bg-[var(--color-primary)]/5',
        )}
      >
        {filtered.length === 0 ? (
          <EmptyState description="No available players match your filters." />
        ) : (
          filtered.map((player) => (
            <RotationPlayerRow
              key={player.id}
              player={player}
              onClick={() => onPlayerClick(player.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
