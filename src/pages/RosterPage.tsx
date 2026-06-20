import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'position' | 'age' | 'overall'

export function RosterPage() {
  const save = useGameStore((s) => s.save)
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    defaultSeasonId,
  )
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<
    'ALL' | 'PG' | 'SG' | 'SF' | 'PF' | 'C'
  >('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('overall')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const userTeamId = save?.league.userTeamId
  const seasonLabel = save
    ? save.metadata.snapshotId
    : snapshot?.seasonLabel ?? null

  const players = useMemo(() => {
    if (save && userTeamId) {
      const rosterIds = new Set(save.league.teams[userTeamId]?.roster ?? [])
      return Object.values(save.league.players).filter((p) => rosterIds.has(p.id))
    }
    return snapshot?.players ?? []
  }, [save, userTeamId, snapshot])
  const teams = useMemo(
    () => (save ? Object.values(save.league.teams) : snapshot?.teams ?? []),
    [save, snapshot],
  )

  const rows = useMemo(() => {
    const filtered = players.filter((p) => {
      if (position !== 'ALL' && p.position !== position) return false
      if (!search) return true
      const s = search.toLowerCase()
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(s)
    })
    const sorted = [...filtered].sort((a, b) => {
      const cmp =
        sortKey === 'name'
          ? `${a.lastName}${a.firstName}`.localeCompare(
              `${b.lastName}${b.firstName}`,
            )
          : sortKey === 'position'
            ? a.position.localeCompare(b.position)
            : sortKey === 'age'
              ? a.age - b.age
              : overall(a.ratings) - overall(b.ratings)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [players, position, search, sortKey, sortDir])

  return (
    <div>
      <PageHeader
        eyebrow="Front Office"
        title="Roster"
        description={
          save
            ? `${save.metadata.teamName} roster — ${save.metadata.snapshotId}`
            : 'Every player in the current snapshot. Real NBA names with stat-derived ratings. Click a row to open the career tab.'
        }
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players…"
            className="w-full sm:w-72 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <div className="flex gap-1">
            {(['ALL', 'PG', 'SG', 'SF', 'PF', 'C'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                className={cn(
                  'rounded-md border px-2.5 h-9 text-xs uppercase tracking-[0.12em]',
                  position === p
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-[var(--color-muted-foreground)]">
            {rows.length} player{rows.length === 1 ? '' : 's'} ·{' '}
            {seasonLabel ?? '—'}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] border-b border-[var(--color-line-soft)]">
                  <Th
                    onClick={() => {
                      if (sortKey === 'name') {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortKey('name')
                        setSortDir('desc')
                      }
                    }}
                    active={sortKey === 'name'}
                    dir={sortDir}
                  >
                    Player
                  </Th>
                  <Th
                    onClick={() => {
                      if (sortKey === 'position') {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortKey('position')
                        setSortDir('desc')
                      }
                    }}
                    active={sortKey === 'position'}
                    dir={sortDir}
                  >
                    Pos
                  </Th>
                  <Th
                    onClick={() => {
                      if (sortKey === 'age') {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortKey('age')
                        setSortDir('desc')
                      }
                    }}
                    active={sortKey === 'age'}
                    dir={sortDir}
                  >
                    Age
                  </Th>
                  <Th
                    onClick={() => {
                      if (sortKey === 'overall') {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortKey('overall')
                        setSortDir('desc')
                      }
                    }}
                    active={sortKey === 'overall'}
                    dir={sortDir}
                  >
                    OVR
                  </Th>
                  <th className="text-right px-3 py-2 font-medium">3PT</th>
                  <th className="text-right px-3 py-2 font-medium">Pass</th>
                  <th className="text-right px-3 py-2 font-medium">D-IQ</th>
                  <th className="text-right px-3 py-2 font-medium">Speed</th>
                  <th className="text-right px-3 py-2 font-medium">Pot</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-10 text-sm text-[var(--color-muted-foreground)]"
                    >
                      {players.length > 0
                        ? 'No players match those filters.'
                        : 'Loading snapshot…'}
                    </td>
                  </tr>
                ) : null}
                {rows.map((p) => {
                  const team = teams.find((t) => t.id === p.teamId)
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--color-line-soft)] last:border-b-0 hover:bg-[var(--color-surface-2)]/60"
                    >
                      <td className="px-5 py-2">
                        <Link
                          to={`/player/${p.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div
                            className="size-8 rounded-md grid place-items-center font-display text-[10px]"
                            style={{
                              backgroundColor:
                                team?.colors?.primary ?? '#1d428a',
                              color: '#0b0d10',
                            }}
                          >
                            {team?.abbreviation ?? '—'}
                          </div>
                          <div>
                            <div className="font-display text-sm group-hover:text-[var(--color-primary)] transition-colors">
                              {p.firstName} {p.lastName}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                              {team
                                ? `${team.city} ${team.name}`
                                : 'Free Agent'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-center">
                        {p.position}
                      </td>
                      <td className="px-3 py-2 font-mono text-center">
                        {p.age}
                      </td>
                      <td className="px-3 py-2 font-mono text-center font-display">
                        {overall(p.ratings)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {p.ratings.threePoint}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {p.ratings.passing}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {p.ratings.defensiveIq}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {p.ratings.speed}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {p.ratings.potential}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: 'asc' | 'desc'
}) {
  return (
    <th className="text-left px-3 py-2 font-medium">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-[var(--color-foreground)]"
      >
        {children}
        {active ? <span aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span> : null}
      </button>
    </th>
  )
}

function overall(r: {
  insideScoring: number
  threePoint: number
  passing: number
  defensiveIq: number
  speed: number
  offensiveRebound: number
  defensiveRebound: number
  perimeterDefense: number
  interiorDefense: number
  potential: number
}): number {
  return Math.round(
    (r.insideScoring * 0.18 +
      r.threePoint * 0.12 +
      r.passing * 0.12 +
      r.defensiveIq * 0.12 +
      r.speed * 0.06 +
      (r.offensiveRebound + r.defensiveRebound) * 0.05 +
      (r.perimeterDefense + r.interiorDefense) * 0.1 +
      r.potential * 0.05) /
      0.8,
  )
}
