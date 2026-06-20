import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrainingFocusPicker } from '@/components/development/TrainingFocusPicker'
import { trainingFocusPreview } from '@/game/sim/developmentEngine'
import type { TrainingFocus } from '@/game/models/training'

export function TrainingPage() {
  const save = useGameStore((s) => s.save)
  const setTeamTrainingFocus = useGameStore((s) => s.setTeamTrainingFocus)
  const setTrainingFocus = useGameStore((s) => s.setTrainingFocus)
  const setLoadManagement = useGameStore((s) => s.setLoadManagement)

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
          {roster.map((player) => {
            const cap =
              team.loadManagement.find((e) => e.playerId === player.id)?.targetMinutes ??
              team.lineup.targetMinutes[player.id] ??
              32
            return (
              <div
                key={player.id}
                className="rounded-lg border border-[var(--color-line-soft)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">
                    {player.firstName} {player.lastName}
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    OVR {player.ratings.overall}
                  </div>
                </div>
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
          })}
        </CardContent>
      </Card>
    </div>
  )
}
