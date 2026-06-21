import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent } from '@/components/ui/card'
import type { RecordCategory } from '@/game/models/record'

type Tab = 'single_game' | 'season' | 'career' | 'team'

const TAB_LABELS: Record<Tab, string> = {
  single_game: 'Single Game',
  season: 'Season',
  career: 'Career',
  team: 'Team',
}

const CATEGORY_GROUP: Record<Tab, RecordCategory[]> = {
  single_game: ['single_game_points', 'single_game_assists', 'single_game_rebounds'],
  season: ['season_ppg', 'season_apg', 'season_rpg'],
  career: ['career_points', 'career_assists', 'career_rebounds', 'career_championships'],
  team: ['team_wins_season', 'team_championships'],
}

const CATEGORY_LABELS: Record<RecordCategory, string> = {
  single_game_points: 'Points',
  single_game_assists: 'Assists',
  single_game_rebounds: 'Rebounds',
  season_ppg: 'PPG',
  season_apg: 'APG',
  season_rpg: 'RPG',
  career_points: 'Total Points',
  career_assists: 'Total Assists',
  career_rebounds: 'Total Rebounds',
  career_championships: 'Championships',
  team_wins_season: 'Wins (Season)',
  team_championships: 'Championships',
}

function formatValue(category: RecordCategory, value: number): string {
  if (category.includes('points') || category.includes('rebounds') || category.includes('assists')) {
    if (category.startsWith('career') || category.startsWith('team')) {
      return value.toLocaleString()
    }
  }
  if (category === 'career_championships' || category === 'team_championships') {
    return String(value)
  }
  return value % 1 === 0 ? String(value) : value.toFixed(1)
}

export function RecordsPage() {
  const save = useGameStore((s) => s.save)
  const [tab, setTab] = useState<Tab>('single_game')

  const records = save?.league.records ?? []
  const players = save?.league.players ?? {}
  const teams = save?.league.teams ?? {}

  const grouped = useMemo(() => {
    const groups: Record<RecordCategory, typeof records> = {} as Record<RecordCategory, typeof records>
    for (const cat of CATEGORY_GROUP[tab]) {
      groups[cat] = records.filter((r) => r.category === cat)
    }
    return groups
  }, [records, tab])

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="League"
        title="Records"
        description="All-time and single-season records across the league."
      />

      <div className="flex gap-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t
                ? 'bg-[var(--color-surface-3)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)]'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORY_GROUP[tab].map((cat) => {
          const entries = grouped[cat] ?? []
          const sorted = [...entries].sort((a, b) => b.value - a.value)
          return (
            <Card key={cat}>
              <CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
                  {CATEGORY_LABELS[cat]}
                </div>
                {sorted.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">No records yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-muted-foreground)] text-xs">
                        <th className="pb-1 pr-2">#</th>
                        <th className="pb-1 pr-2">Player</th>
                        <th className="pb-1 pr-2">Team</th>
                        <th className="pb-1 pr-2 text-right">Value</th>
                        <th className="pb-1 text-right">Season</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.slice(0, 10).map((rec, i) => {
                        const player = rec.playerId ? players[rec.playerId] : undefined
                        const team = rec.teamId ? teams[rec.teamId] : undefined
                        const playerName = player
                          ? `${player.firstName} ${player.lastName}`
                          : team
                            ? `${team.city} ${team.name}`
                            : '—'
                        const playerLink = rec.playerId
                          ? `/player/${rec.playerId}`
                          : undefined
                        return (
                          <tr
                            key={rec.id}
                            className="border-t border-[var(--color-line-soft)]"
                          >
                            <td className="py-1.5 pr-2 text-[var(--color-muted-foreground)]">
                              {i + 1}
                            </td>
                            <td className="py-1.5 pr-2">
                              {playerLink ? (
                                <Link
                                  to={playerLink}
                                  className="text-[var(--color-primary)] hover:underline"
                                >
                                  {playerName}
                                </Link>
                              ) : (
                                playerName
                              )}
                            </td>
                            <td className="py-1.5 pr-2 text-[var(--color-muted-foreground)]">
                              {team ? `${team.city} ${team.name}` : '—'}
                            </td>
                            <td className="py-1.5 pr-2 text-right font-medium">
                              {formatValue(cat, rec.value)}
                            </td>
                            <td className="py-1.5 text-right text-[var(--color-muted-foreground)]">
                              {rec.seasonYear ?? rec.date ?? '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
