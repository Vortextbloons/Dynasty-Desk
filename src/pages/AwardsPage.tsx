import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AWARD_SHORT_LABELS, AWARD_LABELS } from '@/game/models/award'
import { playerName } from '@/game/league/awardsEngine'
import { AwardRaceChart } from '@/components/charts/AwardRaceChart'

type Tab = 'current' | 'past'

export function AwardsPage() {
  const save = useGameStore((s) => s.save)
  const [tab, setTab] = useState<Tab>('current')

  const races = save?.league.awardRaces ?? {}
  const history = save?.league.awardsHistory ?? []
  const players = save?.league.players ?? {}

  const pastSeasons = useMemo(
    () => [...history].sort((a, b) => b.season.localeCompare(a.season)),
    [history],
  )

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="League"
        title="Awards"
        description="Live award races and historical winners."
      />

      <div className="flex gap-2">
        {(['current', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              tab === t
                ? 'bg-[var(--color-surface-3)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {races.mvp && races.mvp.length > 0 && (
        <AwardRaceChart entries={races.mvp} awardName={AWARD_LABELS.mvp} />
      )}

      {tab === 'current' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(['mvp', 'dpoy', 'roy', 'smoy'] as const).map((key) => {
            const list = races[key] ?? []
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">
                    {AWARD_SHORT_LABELS[key === 'smoy' ? 'smoy' : key]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.length === 0 ? (
                    <p className="text-xs text-[var(--color-muted-foreground)]">No candidates yet.</p>
                  ) : (
                    list.map((entry, i) => {
                      const p = players[entry.playerId]
                      return (
                        <div key={entry.playerId} className="flex justify-between text-sm">
                          <span>
                            {i + 1}. {playerName(p)} ({entry.statLine})
                          </span>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {pastSeasons.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No past awards yet.</p>
          ) : (
            pastSeasons.map((season) => (
              <Card key={season.season}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">{season.season}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1 sm:grid-cols-2">
                  {season.awards.map((a) => {
                    const p = players[a.playerId]
                    return (
                      <div key={`${a.award}-${a.playerId}`} className="text-sm">
                        <span className="text-[var(--color-muted-foreground)]">
                          {AWARD_SHORT_LABELS[a.award]}:
                        </span>{' '}
                        {playerName(p)}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
