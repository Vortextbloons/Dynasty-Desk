import { useMemo } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { MyPickPanel } from '@/components/draft/MyPickPanel'
import { ProspectCard } from '@/components/draft/ProspectCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getCurrentPickOwner,
  getAvailableProspects,
} from '@/game/league/draftEngine'
import { Lock } from 'lucide-react'

export function DraftPage() {
  const save = useGameStore((s) => s.save)
  const makeDraftPick = useGameStore((s) => s.makeDraftPick)
  const autoDraftOffClock = useGameStore((s) => s.autoDraftOffClock)
  const skipDraftPick = useGameStore((s) => s.skipDraftPick)

  const draft = useMemo(() => {
    if (!save) return null
    return Object.values(save.league.drafts).find((d) => d?.status === 'in_progress' || d?.status === 'complete') ?? null
  }, [save])

  const draftClass = useMemo(() => {
    if (!save || !draft) return null
    return save.league.draftClasses[draft.draftClassId] ?? null
  }, [save, draft])

  const scoutingState = useMemo(() => {
    if (!save || !draft) return null
    const key = `${save.league.userTeamId}-${draft.draftClassId}`
    return save.league.scoutingState[key] ?? null
  }, [save, draft])

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  if (save.league.phase !== 'draft' || !draft || !draftClass) {
    return (
      <div>
        <PageHeader title="Draft" description="NBA Draft" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          The draft is not active. Advance from the offseason hub when ready.
        </p>
      </div>
    )
  }

  const owner = getCurrentPickOwner(save.league, draft)
  const isUserPick = owner?.teamId === save.league.userTeamId
  const userTeam = save.league.teams[save.league.userTeamId]
  const available = getAvailableProspects(save.league, draft)

  const handlePick = (prospectId: string, isTwoWay: boolean) => {
    const result = makeDraftPick(prospectId, isTwoWay)
    if (!result.ok) toast.error(result.reason ?? 'Pick failed')
    else toast.success('Pick made!')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${draft.seasonYear} NBA Draft`}
        title={`Round ${draft.currentPickNumber <= 30 ? 1 : 2}`}
        description={`Pick ${draft.currentPickNumber} / 60 · Order: ${draft.orderSource === 'lottery' ? 'Lottery' : 'Inverse record'}`}
      />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <Lock className="size-4 text-amber-500" />
          Trade Center is disabled during the draft.
        </CardContent>
      </Card>

      {isUserPick && userTeam && (
        <MyPickPanel
          pickNumber={draft.currentPickNumber}
          teamName={`${userTeam.city} ${userTeam.name}`}
          prospects={available}
          scoutingAllocations={scoutingState?.allocations ?? {}}
          onPick={handlePick}
          onAutoPick={() => {
            skipDraftPick()
            autoDraftOffClock()
          }}
        />
      )}

      {!isUserPick && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm">Waiting for other teams to pick…</span>
            <Button size="sm" onClick={() => autoDraftOffClock()}>
              Sim to my pick
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-medium mb-3">Draft board</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {draftClass.prospects.slice(0, 18).map((p) => (
            <ProspectCard
              key={p.id}
              prospect={p}
              scoutingPoints={scoutingState?.allocations[p.id]}
            />
          ))}
        </div>
      </div>

      {draft.picks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Recent picks</h3>
          <ul className="space-y-1 text-sm">
            {[...draft.picks].reverse().slice(0, 8).map((pick) => {
              const prospect = draftClass.prospects.find((p) => p.id === pick.prospectId)
              const team = save.league.teams[pick.pickedByTeamId]
              return (
                <li key={pick.id}>
                  #{pick.pickNumber} {prospect ? `${prospect.firstName} ${prospect.lastName}` : pick.prospectId}
                  {' — '}
                  {team ? `${team.abbreviation}` : pick.pickedByTeamId}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
