import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AWARD_SHORT_LABELS, AWARD_LABELS } from '@/game/models/award'
import { AwardRaceChart } from '@/components/charts/AwardRaceChart'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { EmptyState } from '@/components/shared/EmptyState'

type Tab = 'current' | 'past'

export function AwardsPage() {
  const save = useGameStore((s) => s.save)
  const [tab, setTab] = useState<Tab>('current')

  const races = save?.league.awardRaces ?? {}
  const history = useMemo(() => save?.league.awardsHistory ?? [], [save])
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
          <Button
            key={t}
            size="sm"
            variant={tab === t ? 'default' : 'secondary'}
            onClick={() => setTab(t)}
          >
            {t === 'current' ? 'Current races' : 'Past winners'}
          </Button>
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
                    <EmptyState description="No candidates yet." />
                  ) : (
                    list.map((entry, i) => {
                      const p = players[entry.playerId]
                      if (!p) return null
                      return (
                        <PlayerListItem
                          key={entry.playerId}
                          player={p}
                          linkTo={`/player/${p.id}`}
                          subtitle={entry.statLine}
                          trailing={
                            <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                              #{i + 1}
                            </span>
                          }
                          className="rounded-md px-2 py-1.5"
                        />
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
            <EmptyState description="No past awards yet." />
          ) : (
            pastSeasons.map((season) => (
              <Card key={season.season}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">{season.season}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {season.awards.map((a) => {
                    const p = players[a.playerId]
                    if (!p) return null
                    return (
                      <PlayerListItem
                        key={`${a.award}-${a.playerId}`}
                        player={p}
                        linkTo={`/player/${p.id}`}
                        subtitle={AWARD_SHORT_LABELS[a.award]}
                        size={28}
                        className="rounded-md px-2 py-1"
                      />
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
