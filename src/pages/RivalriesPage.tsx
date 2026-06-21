import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent } from '@/components/ui/card'

export function RivalriesPage() {
  const save = useGameStore((s) => s.save)
  const rivalries = Object.values(save?.league.rivalries ?? {})
  const teams = save?.league.teams ?? {}
  const players = save?.league.players ?? {}

  const sorted = useMemo(
    () => [...rivalries].sort((a, b) => b.intensityScore - a.intensityScore),
    [rivalries],
  )

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  function teamName(teamId: string): string {
    const t = teams[teamId]
    return t ? `${t.city} ${t.name}` : teamId
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="League"
        title="Rivalries"
        description="The most heated matchups in the league."
      />

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No rivalries tracked yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((r) => {
            const hotPlayer = r.hotPlayer ? players[r.hotPlayer.playerId] : null
            const hotName = hotPlayer
              ? `${hotPlayer.firstName} ${hotPlayer.lastName}`
              : null
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-sm">
                      {teamName(r.teamAId)}{' '}
                      <span className="text-[var(--color-muted-foreground)]">vs</span>{' '}
                      {teamName(r.teamBId)}
                    </div>
                    <span className="text-xs font-medium text-[var(--color-primary)]">
                      {r.intensityScore.toFixed(0)} intensity
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                        Regular Season
                      </div>
                      <div className="font-medium">
                        {r.regularSeasonGames} games
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                        Playoffs
                      </div>
                      <div className="font-medium">
                        {r.playoffMeetings > 0
                          ? `${r.playoffWinsA}–${r.playoffWinsB} (${r.playoffMeetings} series)`
                          : 'None'}
                      </div>
                    </div>
                  </div>

                  {hotName && (
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      Hot player:{' '}
                      <span className="text-[var(--color-foreground)] font-medium">
                        {hotName}
                      </span>{' '}
                      ({r.hotPlayer!.ppgVsOpponent.toFixed(1)} PPG vs opp)
                    </div>
                  )}

                  {r.lastMeetingDate && (
                    <div className="text-[10px] text-[var(--color-muted-foreground)]">
                      Last meeting: {r.lastMeetingDate}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
