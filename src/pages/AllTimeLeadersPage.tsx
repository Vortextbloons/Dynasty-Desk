import { useMemo, useState } from 'react'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import {
  perGame,
  type PlayerSeasonStats,
} from '@/game/models/playerSeasonStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

type Category =
  | 'ppg'
  | 'rpg'
  | 'apg'
  | 'spg'
  | 'bpg'
  | 'tsPct'
  | 'vorp'
  | 'champions'
type Era = 'all' | '1990s' | '2000s' | '2010s' | '2020s'

const CATEGORIES: {
  id: Category
  label: string
  format: (s: PlayerSeasonStats) => number | string
  perGame: boolean
}[] = [
  {
    id: 'ppg',
    label: 'PPG (career avg)',
    format: (s) => perGame(s).ppg,
    perGame: true,
  },
  {
    id: 'rpg',
    label: 'RPG (career avg)',
    format: (s) => perGame(s).rpg,
    perGame: true,
  },
  {
    id: 'apg',
    label: 'APG (career avg)',
    format: (s) => perGame(s).apg,
    perGame: true,
  },
  {
    id: 'spg',
    label: 'SPG (career avg)',
    format: (s) => perGame(s).spg,
    perGame: true,
  },
  {
    id: 'bpg',
    label: 'BPG (career avg)',
    format: (s) => perGame(s).bpg,
    perGame: true,
  },
  {
    id: 'tsPct',
    label: 'TS% (career avg)',
    format: (s) => s.tsPct,
    perGame: false,
  },
  { id: 'vorp', label: 'Total VORP', format: (s) => s.vorp, perGame: false },
]

const ERAS: { id: Era; label: string; start: number; end: number }[] = [
  { id: 'all', label: 'All time', start: 1990, end: 2029 },
  { id: '1990s', label: '1990s', start: 1990, end: 1999 },
  { id: '2000s', label: '2000s', start: 2000, end: 2009 },
  { id: '2010s', label: '2010s', start: 2010, end: 2019 },
  { id: '2020s', label: '2020s', start: 2020, end: 2029 },
]

export function AllTimeLeadersPage() {
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    defaultSeasonId,
  )
  const [category, setCategory] = useState<Category>('ppg')
  const [era, setEra] = useState<Era>('all')
  const [minGames, setMinGames] = useState(100)

  const leaders = useMemo(() => {
    if (!snapshot) return []
    const eraRange = ERAS.find((e) => e.id === era) ?? ERAS[0]
    if (!eraRange) return []
    const startYear = eraRange.start
    const endYear = eraRange.end
    const byPlayer = new Map<
      string,
      {
        seasons: PlayerSeasonStats[]
        points: number
        ppg: number
        rpg: number
        apg: number
        spg: number
        bpg: number
        tsPct: number
        vorp: number
        gp: number
      }
    >()
    for (const s of snapshot.seasonStats) {
      const year = Number(s.season.split('-')[0])
      if (Number.isNaN(year) || year < startYear || year > endYear) continue
      if (s.gamesPlayed < 10) continue
      const entry = byPlayer.get(s.playerId) ?? {
        seasons: [],
        points: 0,
        ppg: 0,
        rpg: 0,
        apg: 0,
        spg: 0,
        bpg: 0,
        tsPct: 0,
        vorp: 0,
        gp: 0,
      }
      entry.seasons.push(s)
      entry.points += s.points
      entry.ppg += perGame(s).ppg * s.gamesPlayed
      entry.rpg += perGame(s).rpg * s.gamesPlayed
      entry.apg += perGame(s).apg * s.gamesPlayed
      entry.spg += perGame(s).spg * s.gamesPlayed
      entry.bpg += perGame(s).bpg * s.gamesPlayed
      entry.tsPct += s.tsPct * s.gamesPlayed
      entry.vorp += s.vorp
      entry.gp += s.gamesPlayed
      byPlayer.set(s.playerId, entry)
    }
    const aggregated = Array.from(byPlayer.entries())
      .filter(([, v]) => v.gp >= minGames)
      .map(([playerId, v]) => {
        const player = snapshot.players.find((p) => p.id === playerId)
        return {
          playerId,
          firstName: player?.firstName ?? '?',
          lastName: player?.lastName ?? '?',
          teamAbbrev:
            snapshot.teams.find((t) => t.id === player?.teamId)?.abbreviation ??
            '—',
          seasons: v.seasons.length,
          games: v.gp,
          points: v.points,
          ppg: v.ppg / Math.max(1, v.gp),
          rpg: v.rpg / Math.max(1, v.gp),
          apg: v.apg / Math.max(1, v.gp),
          spg: v.spg / Math.max(1, v.gp),
          bpg: v.bpg / Math.max(1, v.gp),
          tsPct: v.tsPct / Math.max(1, v.gp),
          vorp: v.vorp,
        }
      })
    aggregated.sort((a, b) => {
      const av =
        category === 'ppg'
          ? a.ppg
          : category === 'rpg'
            ? a.rpg
            : category === 'apg'
              ? a.apg
              : category === 'spg'
                ? a.spg
                : category === 'bpg'
                  ? a.bpg
                  : category === 'tsPct'
                    ? a.tsPct
                    : a.vorp
      const bv =
        category === 'ppg'
          ? b.ppg
          : category === 'rpg'
            ? b.rpg
            : category === 'apg'
              ? b.apg
              : category === 'spg'
                ? b.spg
                : category === 'bpg'
                  ? b.bpg
                  : category === 'tsPct'
                    ? b.tsPct
                    : b.vorp
      return bv - av
    })
    return aggregated.slice(0, 50)
  }, [snapshot, category, era, minGames])

  const championCount = useMemo(() => {
    if (!snapshot) return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const c of snapshot.champions) {
      const team = snapshot.teams.find((t) => t.id === c.championTeamId)
      if (!team) continue
      for (const p of snapshot.players.filter((p) => p.teamId === team.id)) {
        counts.set(p.id, (counts.get(p.id) ?? 0) + 1)
      }
    }
    return counts
  }, [snapshot])

  return (
    <div>
      <PageHeader
        eyebrow="League"
        title="All-time leaders"
        description="Career averages and totals within the current snapshot. Filter by era, set a minimum games threshold."
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {ERAS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEra(e.id)}
                className={cn(
                  'rounded-md border px-2.5 h-9 text-xs uppercase tracking-[0.12em]',
                  era === e.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'rounded-md border px-2.5 h-9 text-xs',
                  category === c.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <label>Min games</label>
            <input
              type="number"
              min={0}
              step={10}
              value={minGames}
              onChange={(e) =>
                setMinGames(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-20 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 h-9 text-sm font-mono outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            {CATEGORIES.find((c) => c.id === category)?.label ?? category}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] border-b border-[var(--color-line-soft)]">
                  <th className="text-left px-5 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">Player</th>
                  <th className="text-right px-3 py-2 font-medium">Seasons</th>
                  <th className="text-right px-3 py-2 font-medium">Games</th>
                  <th className="text-right px-3 py-2 font-medium">Value</th>
                  <th className="text-right px-3 py-2 font-medium">Titles</th>
                </tr>
              </thead>
              <tbody>
                {leaders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-sm text-[var(--color-muted-foreground)]"
                    >
                      {snapshot
                        ? 'No players match those filters.'
                        : 'Loading snapshot…'}
                    </td>
                  </tr>
                ) : null}
                {leaders.map((p, i) => {
                  const value =
                    category === 'ppg'
                      ? p.ppg
                      : category === 'rpg'
                        ? p.rpg
                        : category === 'apg'
                          ? p.apg
                          : category === 'spg'
                            ? p.spg
                            : category === 'bpg'
                              ? p.bpg
                              : category === 'tsPct'
                                ? p.tsPct
                                : p.vorp
                  return (
                    <tr
                      key={p.playerId}
                      className="border-b border-[var(--color-line-soft)] last:border-b-0"
                    >
                      <td className="px-5 py-2 font-mono text-[var(--color-muted-foreground)]">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-display">
                        {p.firstName} {p.lastName}{' '}
                        <span className="text-[10px] text-[var(--color-muted-foreground)] font-mono ml-1">
                          {p.teamAbbrev}
                        </span>
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {p.seasons}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {p.games}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {value.toFixed(2)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {championCount.get(p.playerId) ?? 0}
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
