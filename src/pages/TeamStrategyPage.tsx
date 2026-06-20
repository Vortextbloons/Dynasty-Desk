import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { StrategyEditor } from '@/components/strategy/StrategyEditor'
import type { TeamStrategy } from '@/game/models/team'

export function TeamStrategyPage() {
  const save = useGameStore((s) => s.save)
  const setTeamStrategy = useGameStore((s) => s.setTeamStrategy)
  const [draft, setDraft] = useState<TeamStrategy | null>(null)

  const team = useMemo(() => {
    if (!save) return null
    return save.league.teams[save.league.userTeamId] ?? null
  }, [save])

  const strategy = draft ?? team?.strategy

  if (!save || !team || !strategy) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front Office"
        title="Team Strategy"
        description="Offensive and defensive schemes that shape possession sim output."
        actions={
          <button
            type="button"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)]"
            onClick={() => {
              setTeamStrategy(team.id, strategy)
              setDraft(null)
            }}
          >
            Save strategy
          </button>
        }
      />
      <StrategyEditor strategy={strategy} onChange={setDraft} />
    </div>
  )
}
