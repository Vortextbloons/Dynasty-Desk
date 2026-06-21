import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { MyPickPanel } from '@/components/draft/MyPickPanel'
import { ProspectCard } from '@/components/draft/ProspectCard'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { Card, CardContent } from '@/components/ui/card'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import {
  getActiveDraft,
  getCurrentPickOwner,
  getAvailableProspects,
  totalDraftSlotsForSeason,
} from '@/game/league/draftEngine'
import {
  ChevronRight,
  FastForward,
  Lock,
  RadioTower,
  Trophy,
} from 'lucide-react'

export function DraftPage() {
  const save = useGameStore((s) => s.save)
  const makeDraftPick = useGameStore((s) => s.makeDraftPick)
  const advanceDraftPick = useGameStore((s) => s.advanceDraftPick)
  const autoDraftOffClock = useGameStore((s) => s.autoDraftOffClock)
  const skipDraftPick = useGameStore((s) => s.skipDraftPick)
  const ensureDraftProgress = useGameStore((s) => s.ensureDraftProgress)
  const advancePhaseIfReady = useGameStore((s) => s.advancePhaseIfReady)
  const navigate = useNavigate()
  const autoAdvancedRef = useRef(false)

  const draft = useMemo(() => {
    if (!save || save.league.phase !== 'draft') return null
    return getActiveDraft(save.league) ?? null
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

  useEffect(() => {
    ensureDraftProgress()
  }, [ensureDraftProgress, save?.metadata.id, save?.league.phase])

  useEffect(() => {
    autoAdvancedRef.current = false
  }, [save?.metadata.id, save?.league.seasonYear])

  useEffect(() => {
    if (autoAdvancedRef.current) return
    if (!save || save.league.phase !== 'draft') return
    if (draft?.status !== 'complete') return
    autoAdvancedRef.current = true
    void (async () => {
      const result = await advancePhaseIfReady()
      if (result?.newPhase === 'free_agency') {
        toast.success('Draft complete — moving to free agency')
        void navigate('/free-agency')
      }
    })()
  }, [save, draft?.status, advancePhaseIfReady, navigate])

  if (!save) {
    return (
      <div className="p-6 text-sm text-[var(--color-muted-foreground)]">
        No active save.
      </div>
    )
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
  const onClockTeam = owner ? save.league.teams[owner.teamId] : null
  const available = getAvailableProspects(save.league, draft)
  const teamCount = Object.keys(save.league.teams).length
  const totalSlots = totalDraftSlotsForSeason(save.league, draft.seasonYear)
  const draftComplete = draft.status === 'complete'
  const recentPicks = [...draft.picks].reverse().slice(0, 10)

  const handlePick = (prospectId: string, isTwoWay: boolean) => {
    const result = makeDraftPick(prospectId, isTwoWay)
    if (!result.ok) toast.error(result.reason ?? 'Pick failed')
    else toast.success('Pick submitted. The next team is on the clock.')
  }

  const handleAdvanceOne = () => {
    const result = advanceDraftPick()
    if (!result.ok) toast.error(result.reason ?? 'Could not advance the draft.')
    else if (result.draftComplete) toast.success('Draft complete.')
  }

  const handleSimToUser = () => {
    const result = autoDraftOffClock()
    if (!result.ok) {
      toast.error(result.reason ?? 'Could not sim to your pick.')
    } else if (result.draftComplete) {
      toast.success('Draft complete.')
    } else if (result.onUserClock) {
      toast.success('Your pick is up.')
    } else if (result.picksSimulated && result.picksSimulated > 0) {
      toast.success(`Simmed ${result.picksSimulated} picks.`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${draft.seasonYear} NBA Draft`}
        title={`Round ${draft.currentPickNumber <= teamCount ? 1 : 2}`}
        description={
          draftComplete
            ? `Draft complete · ${draft.picks.length} / ${totalSlots} picks made`
            : `Pick ${draft.currentPickNumber} / ${totalSlots} · Order: ${draft.orderSource === 'lottery' ? 'Lottery' : 'Inverse record'}`
        }
      />

      <Card className="overflow-hidden border-[var(--color-primary)]/20 bg-[var(--color-surface-1)]">
        <CardContent className="relative grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-7">
          <div>
            <SectionLabel className="mb-4 flex items-center gap-2 text-[var(--color-primary)]">
              <RadioTower className="size-4" /> Live Draft Room
            </SectionLabel>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <div className="font-display text-6xl leading-none sm:text-7xl">
                  #{draftComplete ? totalSlots : draft.currentPickNumber}
                </div>
                <div className="mt-2 text-sm uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  {draftComplete ? 'Final pick logged' : 'On the clock'}
                </div>
              </div>
              <div className="min-w-0 pb-2">
                <div className="font-display text-2xl sm:text-4xl">
                  {draftComplete
                    ? 'Draft complete'
                    : onClockTeam
                      ? `${onClockTeam.city} ${onClockTeam.name}`
                      : 'Awaiting pick'}
                </div>
                <div className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {draft.picks.length} of {totalSlots} selections made ·{' '}
                  {draft.orderSource === 'lottery'
                    ? 'lottery order'
                    : 'inverse-record order'}
                </div>
              </div>
            </div>

            {!draftComplete && (
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={handleAdvanceOne} disabled={isUserPick}>
                  <ChevronRight className="mr-2 size-4" /> Next pick
                </Button>
                <Button variant="secondary" onClick={handleSimToUser} disabled={isUserPick}>
                  <FastForward className="mr-2 size-4" /> Sim to my pick
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-4">
            <SectionLabel className="mb-3 flex items-center gap-2">
              <Trophy className="size-4" /> Pick Feed
            </SectionLabel>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recentPicks.length === 0 ? (
                <EmptyState description="No picks yet. Start the clock to begin." />
              ) : (
                recentPicks.map((pick) => {
                  const prospect = draftClass.prospects.find(
                    (p) => p.id === pick.prospectId,
                  )
                  const team = save.league.teams[pick.pickedByTeamId]
                  if (!prospect) return null
                  return (
                    <div
                      key={pick.id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-3 py-2"
                    >
                      <PlayerHeadshot
                        player={{
                          firstName: prospect.firstName,
                          lastName: prospect.lastName,
                          externalId: prospect.externalId,
                        }}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          #{pick.pickNumber} {prospect.firstName} {prospect.lastName}
                        </div>
                        <div className="text-xs text-[var(--color-muted-foreground)]">
                          {prospect.position} · OVR {prospect.visibleRatings.overall ?? '?'} ·{' '}
                          {team?.abbreviation ?? '—'}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {draftComplete ? (
        <Card>
          <CardContent className="p-4 text-sm">
            The draft is complete. Advance from the{' '}
            <Link
              to="/offseason"
              className="text-[var(--color-primary)] hover:underline"
            >
              offseason hub
            </Link>{' '}
            when you are ready.
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <Lock className="size-4 text-amber-500" />
          Trade Center is disabled during the draft.
        </CardContent>
      </Card>

      {!draftComplete && isUserPick && userTeam && (
        <MyPickPanel
          pickNumber={draft.currentPickNumber}
          teamName={`${userTeam.city} ${userTeam.name}`}
          prospects={available}
          scoutingAllocations={scoutingState?.allocations ?? {}}
          onPick={handlePick}
          onAutoPick={() => skipDraftPick()}
        />
      )}

      <div>
        <h3 className="text-sm font-medium mb-3">Available draft board</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((p) => (
            <ProspectCard
              key={p.id}
              prospect={p}
              scoutingPoints={scoutingState?.allocations[p.id]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
