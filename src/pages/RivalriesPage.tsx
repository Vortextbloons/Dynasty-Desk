import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent } from '@/components/ui/card'
import { TeamLogo } from '@/components/team/TeamLogo'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { formatGameDate } from '@/lib/format'

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
            const teamA = teams[r.teamAId]
            const teamB = teams[r.teamBId]
            if (!teamA || !teamB) return null
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo team={teamA} size={28} />
                      <span className="font-display text-sm truncate">
                        {teamName(r.teamAId)}
                      </span>
                      <span className="text-[var(--color-muted-foreground)] shrink-0">vs</span>
                      <TeamLogo team={teamB} size={28} />
                      <span className="font-display text-sm truncate">
                        {teamName(r.teamBId)}
                      </span>
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

                  {hotPlayer && (
                    <PlayerListItem
                      player={hotPlayer}
                      size={28}
                      subtitle={`${r.hotPlayer!.ppgVsOpponent.toFixed(1)} PPG vs opponent`}
                      linkTo={`/player/${hotPlayer.id}`}
                      className="rounded-md border border-[var(--color-line-soft)] px-2 py-1.5"
                    />
                  )}

                  {r.lastMeetingDate && (
                    <div className="text-[10px] text-[var(--color-muted-foreground)]">
                      Last meeting: {formatGameDate(r.lastMeetingDate)}
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
