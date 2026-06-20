import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { PhaseTimeline } from '@/components/offseason/PhaseTimeline'
import { PendingItemsList } from '@/components/offseason/PendingItemsList'
import { OffseasonLog } from '@/components/offseason/OffseasonLog'
import {
  getExpiringContractCount,
  getPendingOptionCount,
  canAdvancePhase,
} from '@/game/league/offseasonEngine'

const OFFSEASON_PHASES = ['offseason', 'draft', 'free_agency', 'preseason'] as const

export function OffseasonPage() {
  const save = useGameStore((s) => s.save)
  const advancePhase = useGameStore((s) => s.advancePhase)
  const [advancing, setAdvancing] = useState(false)

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  const league = save.league
  const teamId = league.userTeamId

  if (!OFFSEASON_PHASES.includes(league.phase as (typeof OFFSEASON_PHASES)[number])) {
    return (
      <div>
        <PageHeader title="Offseason" description="Offseason hub" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Offseason tools are available after the playoffs. Current phase: {league.phase.replace(/_/g, ' ')}.
        </p>
      </div>
    )
  }

  const advanceGuard = canAdvancePhase(league)

  const handleAdvance = async () => {
    setAdvancing(true)
    try {
      const result = await advancePhase()
      if (result?.blocked) {
        toast.error(result.reason ?? 'Cannot advance phase.')
        return
      }
      if (result?.newPhase) {
        toast.success(`Advanced to ${result.newPhase.replace(/_/g, ' ')}`)
      }
    } catch {
      toast.error('Failed to advance phase.')
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={league.rules.seasonLabel}
        title="Offseason"
        description="Manage the offseason phase machine — draft, free agency, and season rollover."
      />

      <PhaseTimeline
        currentPhase={league.phase}
        onAdvance={handleAdvance}
        advancing={advancing}
        canAdvance={advanceGuard.ok}
        blockReason={advanceGuard.ok ? undefined : advanceGuard.reason}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PendingItemsList
          expiringContracts={getExpiringContractCount(league, teamId)}
          teamOptions={getPendingOptionCount(league, teamId)}
          playerOptions={0}
          qualifyingOffers={league.qualifyingOffers.filter((q) => q.teamId === teamId).length}
        />
        <OffseasonLog events={league.offseasonLog} />
      </div>
    </div>
  )
}
