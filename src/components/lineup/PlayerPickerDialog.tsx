import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Player } from '@/game/models/player'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/shared/Chip'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'

interface PlayerPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  players: Player[]
  disabledIds: Set<string>
  onSelect: (playerId: string) => void
  showAll?: boolean
}

export function PlayerPickerDialog({
  open,
  onOpenChange,
  players,
  disabledIds,
  onSelect,
  showAll = false,
}: PlayerPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'available' | 'all'>(
    showAll ? 'all' : 'available',
  )

  const filtered = useMemo(() => {
    let list = players
    if (filterMode === 'available') {
      list = list.filter((p) => !disabledIds.has(p.id))
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q),
      )
    }
    return list.sort((a, b) => b.ratings.overall - a.ratings.overall)
  }, [players, disabledIds, search, filterMode])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>Select Player</AlertDialogTitle>
          <AlertDialogDescription>
            Pick a player to add to this slot.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              placeholder="Search name or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] pl-8 pr-3 py-1.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <Button
            variant={filterMode === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('available')}
          >
            Available
          </Button>
          <Button
            variant={filterMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('all')}
          >
            All
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 space-y-0.5">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No players found.
            </div>
          )}
          {filtered.map((p) => {
            const disabled = disabledIds.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(p.id)
                  onOpenChange(false)
                  setSearch('')
                }}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[var(--color-surface-2)]'
                }`}
              >
                <PlayerHeadshot player={p} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-[10px] text-[var(--color-muted-foreground)]">
                    {p.position} · Age {p.age}
                  </div>
                </div>
                <Chip label={p.position} size="sm" />
                <span className="font-mono text-sm font-display w-6 text-right">
                  {p.ratings.overall}
                </span>
              </button>
            )
          })}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
