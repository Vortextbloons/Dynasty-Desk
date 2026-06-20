import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { PhaseTimeline } from '@/components/offseason/PhaseTimeline'
import { PendingItemsList } from '@/components/offseason/PendingItemsList'
import { OffseasonLog } from '@/components/offseason/OffseasonLog'
import {
  getExpiringContractCount,
  getPendingTeamOptionCount,
  getPendingPlayerOptionCount,
  getPlayersWithPendingOptions,
  canAdvancePhase,
} from '@/game/league/offseasonEngine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const OFFSEASON_PHASES = ['offseason', 'draft', 'free_agency', 'preseason'] as const

export function OffseasonPage() {
  const save = useGameStore((s) => s.save)
  const advancePhase = useGameStore((s) => s.advancePhase)
  const decideOption = useGameStore((s) => s.decideOption)
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
  const pendingOptions = getPlayersWithPendingOptions(league, teamId)

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
          teamOptions={getPendingTeamOptionCount(league, teamId)}
          playerOptions={getPendingPlayerOptionCount(league, teamId)}
          qualifyingOffers={league.qualifyingOffers.filter((q) => q.teamId === teamId).length}
        />
        <OffseasonLog events={league.offseasonLog} />
      </div>

      {pendingOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contract options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingOptions.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {player.firstName} {player.lastName}
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {player.contract.option === 'team' ? 'Team option' : 'Player option'} ·{' '}
                    {player.contract.yearsRemaining} yr left
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      decideOption(player.id, true)
                      toast.success('Option exercised')
                    }}
                  >
                    Exercise
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      decideOption(player.id, false)
                      toast.success('Option declined')
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
