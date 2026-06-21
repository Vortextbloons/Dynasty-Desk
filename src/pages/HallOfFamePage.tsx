import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function HallOfFamePage() {
  const save = useGameStore((s) => s.save)
  const hallOfFame = save?.league.hallOfFame ?? []
  const players = save?.league.players ?? {}

  const grouped = useMemo(() => {
    const map = new Map<number, typeof hallOfFame>()
    for (const entry of [...hallOfFame].sort(
      (a, b) => b.inductedSeason - a.inductedSeason,
    )) {
      const list = map.get(entry.inductedSeason) ?? []
      list.push(entry)
      map.set(entry.inductedSeason, list)
    }
    return map
  }, [hallOfFame])

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="League"
        title="Hall of Fame"
        description="The greatest players in league history."
      />

      {hallOfFame.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No players inducted yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([season, entries]) => (
          <div key={season} className="space-y-3">
            <h2 className="text-lg font-display text-[var(--color-foreground)]">
              Class of {season}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {entries.map((entry) => {
                const player = players[entry.playerId]
                const playerName = player
                  ? `${player.firstName} ${player.lastName}`
                  : 'Unknown'
                return (
                  <Card key={entry.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display">
                        <Link
                          to={`/player/${entry.playerId}`}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          {playerName}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between text-[var(--color-muted-foreground)]">
                        <span>Voting</span>
                        <span className="font-medium text-[var(--color-foreground)]">
                          {entry.votePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--color-muted-foreground)]">
                        <span>Avg</span>
                        <span className="font-medium text-[var(--color-foreground)]">
                          {entry.careerStats.averages.ppg.toFixed(1)} /{' '}
                          {entry.careerStats.averages.rpg.toFixed(1)} /{' '}
                          {entry.careerStats.averages.apg.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--color-muted-foreground)]">
                        <span>Games</span>
                        <span className="font-medium text-[var(--color-foreground)]">
                          {entry.careerStats.totals.gamesPlayed}
                        </span>
                      </div>
                      {entry.accolades.awards.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {entry.accolades.awards.map((a) => (
                            <span
                              key={a}
                              className="inline-block rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted-foreground)]"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.accolades.championships > 0 && (
                        <div className="text-[var(--color-muted-foreground)]">
                          {entry.accolades.championships}× Champion
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
