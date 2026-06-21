import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrainingFocusPicker } from '@/components/development/TrainingFocusPicker'
import { trainingFocusPreview } from '@/game/sim/developmentEngine'
import type { TrainingFocus } from '@/game/models/training'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { EmptyState } from '@/components/shared/EmptyState'

export function TrainingPage() {
  const save = useGameStore((s) => s.save)
  const setTeamTrainingFocus = useGameStore((s) => s.setTeamTrainingFocus)
  const setTrainingFocus = useGameStore((s) => s.setTrainingFocus)
  const setLoadManagement = useGameStore((s) => s.setLoadManagement)
  const [search, setSearch] = useState('')

  const team = useMemo(() => {
    if (!save) return null
    return save.league.teams[save.league.userTeamId] ?? null
  }, [save])

  const roster = useMemo(() => {
    if (!save || !team) return []
    return team.roster
      .map((id) => save.league.players[id])
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .sort((a, b) => b.ratings.overall - a.ratings.overall)
  }, [save, team])

  const filteredRoster = useMemo(() => {
    if (!search.trim()) return roster
    const q = search.toLowerCase()
    return roster.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q),
    )
  }, [roster, search])

  if (!save || !team) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front Office"
        title="Training"
        description="Team-wide and player-specific development focus. Effects apply at end of season."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Team training focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TrainingFocusPicker
            value={team.trainingFocus}
            onChange={(focus) => setTeamTrainingFocus(team.id, focus)}
          />
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {trainingFocusPreview(team.trainingFocus)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Player focus & load management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              placeholder="Search roster..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] pl-8 pr-3 py-1.5 text-sm"
            />
          </div>

          {filteredRoster.length === 0 ? (
            <EmptyState description="No players match your search." />
          ) : (
            filteredRoster.map((player) => {
              const cap =
                team.loadManagement.find((e) => e.playerId === player.id)?.targetMinutes ??
                team.lineup.targetMinutes[player.id] ??
                32
              return (
                <div
                  key={player.id}
                  className="rounded-lg border border-[var(--color-line-soft)] p-4 space-y-3"
                >
                  <PlayerListItem
                    player={player}
                    team={team}
                    linkTo={`/player/${player.id}`}
                    subtitle={`${player.position} · OVR ${player.ratings.overall}`}
                    trailing={
                      <span className="text-xs text-[var(--color-muted-foreground)] font-mono">
                        {cap} min
                      </span>
                    }
                  />
                  <TrainingFocusPicker
                    compact
                    value={player.development.trainingFocus}
                    onChange={(focus: TrainingFocus) => setTrainingFocus(player.id, focus)}
                  />
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {trainingFocusPreview(player.development.trainingFocus)}
                  </p>
                  <label className="flex items-center gap-3 text-xs">
                    <span className="text-[var(--color-muted-foreground)] shrink-0">
                      Target minutes
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={cap}
                      onChange={(e) =>
                        setLoadManagement(player.id, Number(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 py-1 font-mono"
                    />
                  </label>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
