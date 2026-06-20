import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { ProspectCard } from '@/components/draft/ProspectCard'
import { Button } from '@/components/ui/button'
import { SCOUTING_POINTS_PER_TEAM } from '@/game/league/scoutingEngine'

export function ScoutingPage() {
  const save = useGameStore((s) => s.save)
  const allocateScoutingPoints = useGameStore((s) => s.allocateScoutingPoints)
  const [points, setPoints] = useState(5)

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  const draft = Object.values(save.league.drafts).find((d) => d?.status === 'in_progress')
  const draftClass = draft ? save.league.draftClasses[draft.draftClassId] : null
  const key = draft ? `${save.league.userTeamId}-${draft.draftClassId}` : ''
  const scouting = key ? save.league.scoutingState[key] : null

  if (!draft || !draftClass || !scouting) {
    return (
      <div>
        <PageHeader title="Scouting" description="Allocate scouting points" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Scouting opens when the draft begins.
        </p>
      </div>
    )
  }

  const handleAllocate = (prospectId: string) => {
    const result = allocateScoutingPoints(prospectId, points)
    if (!result.ok) toast.error(result.reason ?? 'Failed')
    else toast.success(`Allocated ${points} points`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scouting"
        description={`${scouting.pointsRemaining} / ${SCOUTING_POINTS_PER_TEAM} points remaining`}
      />

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={scouting.pointsRemaining}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-20 rounded border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1 text-sm"
        />
        <span className="text-sm text-[var(--color-muted-foreground)]">points per allocation</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {draftClass.prospects.map((p) => (
          <div key={p.id} className="space-y-2">
            <ProspectCard prospect={p} scoutingPoints={scouting.allocations[p.id]} />
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={scouting.pointsRemaining < points}
              onClick={() => handleAllocate(p.id)}
            >
              Scout (+{points})
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
