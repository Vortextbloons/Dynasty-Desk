import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { StrategyEditor } from '@/components/strategy/StrategyEditor'

export function TeamStrategyPage() {
  const save = useGameStore((s) => s.save)
  const setTeamStrategy = useGameStore((s) => s.setTeamStrategy)

  const team = useMemo(() => {
    if (!save) return null
    return save.league.teams[save.league.userTeamId] ?? null
  }, [save])

  const strategy = team?.strategy

  if (!save || !team || !strategy) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front Office"
        title="Team Strategy"
        description="Offensive and defensive schemes that shape possession sim output."
      />
      <StrategyEditor
        strategy={strategy}
        onChange={(s) => setTeamStrategy(team.id, s)}
      />
    </div>
  )
}
