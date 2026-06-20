import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const POSITIONS = ['ALL', 'PG', 'SG', 'SF', 'PF', 'C'] as const

const STATUS_OPTIONS = ['All', 'Healthy', 'Injured', 'NTC', 'Opt-out'] as const

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'position', label: 'Position' },
  { value: 'age', label: 'Age' },
  { value: 'overall', label: 'Overall' },
  { value: 'threePoint', label: '3PT' },
  { value: 'defense', label: 'Defense' },
  { value: 'capHit', label: 'Cap Hit' },
  { value: 'yearsRemaining', label: 'Years Left' },
]

export interface RosterFilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  positions: string[]
  onPositionsChange: (v: string[]) => void
  status: string[]
  onStatusChange: (v: string[]) => void
  ageRange: [number, number]
  onAgeRangeChange: (v: [number, number]) => void
  sortKey: string
  onSortKeyChange: (v: string) => void
  sortDir: 'asc' | 'desc'
  onSortDirChange: (v: 'asc' | 'desc') => void
  playerCount: number
}

export function RosterFilterBar({
  search,
  onSearchChange,
  positions,
  onPositionsChange,
  status,
  onStatusChange,
  ageRange,
  onAgeRangeChange,
  sortKey,
  onSortKeyChange,
  sortDir,
  onSortDirChange,
  playerCount,
}: RosterFilterBarProps) {
  function togglePosition(pos: string) {
    if (pos === 'ALL') {
      onPositionsChange(['ALL'])
      return
    }
    const next = positions.filter((p) => p !== 'ALL')
    if (next.includes(pos)) {
      const filtered = next.filter((p) => p !== pos)
      onPositionsChange(filtered.length === 0 ? ['ALL'] : filtered)
    } else {
      onPositionsChange([...next, pos])
    }
  }

  function toggleStatus(s: string) {
    if (s === 'All') {
      onStatusChange(['All'])
      return
    }
    const next = status.filter((st) => st !== 'All')
    if (next.includes(s)) {
      const filtered = next.filter((st) => st !== s)
      onStatusChange(filtered.length === 0 ? ['All'] : filtered)
    } else {
      onStatusChange([...next, s])
    }
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search players…"
          className="w-full sm:w-72 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]"
        />

        <div className="flex gap-1">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePosition(p)}
              className={cn(
                'rounded-md border px-2.5 h-9 text-xs uppercase tracking-[0.12em] transition-colors',
                positions.includes(p)
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={cn(
                'rounded-md border px-2.5 h-9 text-xs transition-colors',
                status.includes(s)
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number"
            value={ageRange[0]}
            onChange={(e) =>
              onAgeRangeChange([Number(e.target.value) || 0, ageRange[1]])
            }
            min={0}
            max={50}
            placeholder="Min"
            className="w-14 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 h-9 text-xs font-mono outline-none focus:border-[var(--color-primary)]"
          />
          <span className="text-[var(--color-muted-foreground)] text-xs">–</span>
          <input
            type="number"
            value={ageRange[1]}
            onChange={(e) =>
              onAgeRangeChange([ageRange[0], Number(e.target.value) || 50])
            }
            min={0}
            max={50}
            placeholder="Max"
            className="w-14 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 h-9 text-xs font-mono outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <select
            value={sortKey}
            onChange={(e) => onSortKeyChange(e.target.value)}
            className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 h-9 text-xs outline-none focus:border-[var(--color-primary)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')
            }
            className="rounded-md border border-[var(--color-line-soft)] h-9 w-9 flex items-center justify-center text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className="w-full text-xs text-[var(--color-muted-foreground)]">
          {playerCount} player{playerCount === 1 ? '' : 's'}
        </div>
      </CardContent>
    </Card>
  )
}
