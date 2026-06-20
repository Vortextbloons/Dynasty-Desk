import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  identifyFreeAgents,
  identifyRestrictedFreeAgents,
  computeAskingSalary,
} from '@/game/management/freeAgencyEngine'

function fmtSalary(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${(n / 1_000).toFixed(0)}K`
}

export function FreeAgencyPage() {
  const save = useGameStore((s) => s.save)
  const makeFreeAgentOffer = useGameStore((s) => s.makeFreeAgentOffer)
  const withdrawOffer = useGameStore((s) => s.withdrawOffer)
  const [tab, setTab] = useState<'ufa' | 'rfa' | 'offers' | 'exceptions'>('ufa')

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  const league = save.league
  const isFA = league.phase === 'free_agency'

  const ufaIds = identifyFreeAgents(league).filter(
    (id) => !identifyRestrictedFreeAgents(league, league.qualifyingOffers).includes(id),
  )
  const rfaIds = identifyRestrictedFreeAgents(league, league.qualifyingOffers)
  const myOffers = league.freeAgentOffers.filter((o) => o.teamId === league.userTeamId)

  const handleOffer = (playerId: string, salary: number) => {
    const years = 2
    const result = makeFreeAgentOffer(playerId, {
      years,
      salaryByYear: Array.from({ length: years }, () => salary),
    })
    if (!result.ok) toast.error(result.reason ?? 'Offer failed')
    else toast.success('Offer submitted')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={league.rules.seasonLabel}
        title="Free Agency"
        description="Browse free agents, submit offers, and manage RFA match windows."
      />

      {!isFA && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Free agency opens after the draft. Current phase: {league.phase.replace(/_/g, ' ')}.
        </p>
      )}

      {isFA && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-sm">
            Trade Finder is disabled during free agency — unsigned players are not on rosters.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['ufa', `UFA (${ufaIds.length})`],
            ['rfa', `RFA (${rfaIds.length})`],
            ['offers', `My offers (${myOffers.length})`],
            ['exceptions', 'Exceptions'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'default' : 'secondary'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'ufa' && (
        <div className="space-y-2">
          {ufaIds.slice(0, 30).map((pid) => {
            const player = league.players[pid]
            if (!player) return null
            const asking = computeAskingSalary(player, league.rules)
            return (
              <Card key={pid}>
                <CardContent className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {player.firstName} {player.lastName}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {player.position} · {player.age}y · OVR {player.ratings.overall} · Ask {fmtSalary(asking)}
                    </div>
                  </div>
                  {isFA && (
                    <Button size="sm" onClick={() => handleOffer(pid, asking)}>
                      Offer {fmtSalary(asking)}/yr
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'rfa' && (
        <div className="space-y-2">
          {rfaIds.map((pid) => {
            const player = league.players[pid]
            if (!player) return null
            const asking = computeAskingSalary(player, league.rules)
            const qo = league.qualifyingOffers.find((q) => q.playerId === pid)
            return (
              <Card key={pid}>
                <CardContent className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {player.firstName} {player.lastName}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      RFA · QO team: {qo ? league.teams[qo.teamId]?.abbreviation : '—'} · 7-day match window
                    </div>
                  </div>
                  {isFA && (
                    <Button size="sm" onClick={() => handleOffer(pid, asking)}>
                      Offer sheet
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'offers' && (
        <div className="space-y-2">
          {myOffers.map((offer) => {
            const player = league.players[offer.playerId]
            const daysLeft = Math.max(
              0,
              Math.ceil(
                (new Date(offer.matchDeadline).getTime() - new Date(league.currentDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
            return (
              <Card key={offer.id}>
                <CardContent className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {player ? `${player.firstName} ${player.lastName}` : offer.playerId}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {fmtSalary(offer.salaryByYear[0] ?? 0)}/yr × {offer.years} · Status: {offer.status}
                      {offer.status === 'pending' && ` · Match deadline: ${daysLeft}d`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {offer.status === 'pending' && (
                      <Button size="sm" variant="secondary" onClick={() => withdrawOffer(offer.id)}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'exceptions' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available exceptions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>MLE: {league.teams[league.userTeamId]?.finances.exceptionsUsed.mle ? 'Used' : 'Available'}</div>
              <div>BAE: {league.teams[league.userTeamId]?.finances.exceptionsUsed.bae ? 'Used' : 'Available'}</div>
              <div>Room MLE: {league.teams[league.userTeamId]?.finances.exceptionsUsed.roomMle ? 'Used' : 'Available'}</div>
              <div>Comp picks: {league.compensationPicks.filter((p) => p.currentTeamId === league.userTeamId).length}</div>
            </CardContent>
          </Card>
      )}
    </div>
  )
}
