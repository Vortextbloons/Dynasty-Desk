import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { useTeamRoster } from '@/hooks/useTeamRoster'
import { RosterFilterBar } from '@/components/roster/RosterFilterBar'
import { RosterTable } from '@/components/roster/RosterTable'
import type { Position } from '@/game/models/position'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function RosterPage() {
  const save = useGameStore((s) => s.save)
  const [searchParams] = useSearchParams()
  const teamFilter = searchParams.get('team')

  const [search, setSearch] = useState('')
  const [positions, setPositions] = useState<string[]>([])
  const [status, setStatus] = useState<string[]>([])
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 45])
  const [sortKey, setSortKey] = useState('overall')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const players = useTeamRoster({
    search,
    positions: positions as Position[],
    ageRange,
    status,
    sortKey,
    sortDir,
    teamId: teamFilter ?? undefined,
  })

  const seasonLabel = save ? save.metadata.snapshotId : null

  return (
    <div>
      <PageHeader
        eyebrow="Front Office"
        title="Roster"
        description={
          save
            ? `${save.metadata.teamName} roster — ${save.metadata.snapshotId}`
            : 'Every player in the current snapshot. Real NBA names with stat-derived ratings.'
        }
      />

      {save && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-1">
            Cap Usage
          </div>
          <div className="h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden max-w-md">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, (save.league.teams[save.league.userTeamId]?.finances.payroll ?? 0) / save.league.rules.salaryCap * 100))}%`,
              }}
            />
          </div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-1">
            {fmt(save.league.teams[save.league.userTeamId]?.finances.payroll ?? 0)} / {fmt(save.league.rules.salaryCap)}
          </div>
        </div>
      )}

      <RosterFilterBar
        search={search}
        onSearchChange={setSearch}
        positions={positions}
        onPositionsChange={setPositions}
        status={status}
        onStatusChange={setStatus}
        ageRange={ageRange}
        onAgeRangeChange={setAgeRange}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        playerCount={players.length}
      />

      <div className="mt-4">
        <RosterTable
          players={players}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(key) => {
            if (key === sortKey) {
              setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
            } else {
              setSortKey(key)
              setSortDir('desc')
            }
          }}
          hasSave={!!save}
        />
      </div>

      {seasonLabel && (
        <div className="mt-2 text-xs text-[var(--color-muted-foreground)] text-right">
          {players.length} player{players.length === 1 ? '' : 's'} · {seasonLabel}
        </div>
      )}
    </div>
  )
}
