import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  isOffseasonPhaseReadyToAdvance,
} from '@/game/league/offseasonEngine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const OFFSEASON_PHASES = ['offseason', 'draft', 'free_agency', 'preseason'] as const

export function OffseasonPage() {
  const save = useGameStore((s) => s.save)
  const advancePhase = useGameStore((s) => s.advancePhase)
  const advancePhaseIfReady = useGameStore((s) => s.advancePhaseIfReady)
  const decideOption = useGameStore((s) => s.decideOption)
  const navigate = useNavigate()
  const [advancing, setAdvancing] = useState(false)
  const autoAdvancedRef = useRef(false)

  const league = save?.league
  const teamId = league?.userTeamId

  const isOffseasonPhase =
    league && OFFSEASON_PHASES.includes(league.phase as (typeof OFFSEASON_PHASES)[number])

  const advanceGuard = league ? canAdvancePhase(league) : { ok: false, reason: 'No save' } as const
  const pendingOptions = league && teamId ? getPlayersWithPendingOptions(league, teamId) : []

  const handleAdvance = async () => {
    if (!league) return
    setAdvancing(true)
    try {
      const result = await advancePhase()
      if (result?.blocked) {
        toast.error(result.reason ?? 'Cannot advance phase.')
        return
      }
      if (result?.newPhase) {
        toast.success(`Advanced to ${result.newPhase.replace(/_/g, ' ')}`)
        if (result.newPhase === 'draft') {
          void navigate('/draft')
        } else if (result.newPhase === 'free_agency') {
          void navigate('/free-agency')
        } else if (result.newPhase === 'regular_season') {
          void navigate('/dashboard')
        }
      }
    } catch {
      toast.error('Failed to advance phase.')
    } finally {
      setAdvancing(false)
    }
  }

  useEffect(() => {
    autoAdvancedRef.current = false
  }, [league?.phase, save?.metadata.id, league?.seasonYear])

  useEffect(() => {
    if (autoAdvancedRef.current) return
    if (!league || !teamId) return
    if (!isOffseasonPhaseReadyToAdvance(league, teamId)) return
    autoAdvancedRef.current = true
    void (async () => {
      const result = await advancePhaseIfReady()
      if (result?.newPhase === 'draft') {
        toast.success('Moving to draft')
        void navigate('/draft')
      } else if (result?.newPhase === 'free_agency') {
        toast.success('Moving to free agency')
        void navigate('/free-agency')
      } else if (result?.newPhase) {
        toast.success(`Advanced to ${result.newPhase.replace(/_/g, ' ')}`)
      }
    })()
  }, [league, teamId, advancePhaseIfReady, navigate])

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  if (!isOffseasonPhase || !league || !teamId) {
    return (
      <div>
        <PageHeader title="Offseason" description="Offseason hub" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Offseason tools are available after the playoffs. Current phase: {league?.phase.replace(/_/g, ' ') ?? 'unknown'}.
        </p>
      </div>
    )
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
