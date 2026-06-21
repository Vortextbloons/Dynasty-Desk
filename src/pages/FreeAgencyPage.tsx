import { useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  identifyFreeAgents,
  identifyRestrictedFreeAgents,
  computeAskingSalary,
} from '@/game/management/freeAgencyEngine'
import { formatPhaseLabel, formatOfferStatus, fmtMoney } from '@/lib/format'
import type { Player } from '@/game/models/player'

function filterPlayers(players: Player[], query: string): Player[] {
  if (!query.trim()) return players
  const q = query.toLowerCase()
  return players.filter(
    (p) =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q),
  )
}

export function FreeAgencyPage() {
  const save = useGameStore((s) => s.save)
  const makeFreeAgentOffer = useGameStore((s) => s.makeFreeAgentOffer)
  const withdrawOffer = useGameStore((s) => s.withdrawOffer)
  const matchOfferSheetAction = useGameStore((s) => s.matchOfferSheetAction)
  const [tab, setTab] = useState<'ufa' | 'rfa' | 'offers' | 'exceptions'>('ufa')
  const [search, setSearch] = useState('')

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  const league = save.league
  const isFA = league.phase === 'free_agency' || league.phase === 'preseason'

  const ufaIds = identifyFreeAgents(league).filter(
    (id) => !identifyRestrictedFreeAgents(league, league.qualifyingOffers).includes(id),
  )
  const rfaIds = identifyRestrictedFreeAgents(league, league.qualifyingOffers)
  const myOffers = league.freeAgentOffers.filter((o) => o.teamId === league.userTeamId)
  const incomingSheets = league.freeAgentOffers.filter(
    (o) =>
      o.status === 'pending' &&
      o.teamId !== league.userTeamId &&
      league.qualifyingOffers.some(
        (q) => q.playerId === o.playerId && q.teamId === league.userTeamId,
      ),
  )

  const ufaPlayers = ufaIds
    .map((id) => league.players[id])
    .filter((p): p is Player => Boolean(p))

  const rfaPlayers = rfaIds
    .map((id) => league.players[id])
    .filter((p): p is Player => Boolean(p))

  const filteredUfa = filterPlayers(ufaPlayers, search)
  const filteredRfa = filterPlayers(rfaPlayers, search)

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
          Free agency opens after the draft. Current phase: {formatPhaseLabel(league.phase)}.
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

      {(tab === 'ufa' || tab === 'rfa') && (
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search name or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] pl-8 pr-3 py-1.5 text-sm"
          />
        </div>
      )}

      {tab === 'ufa' && (
        <div className="space-y-2">
          {filteredUfa.length === 0 ? (
            <EmptyState description="No free agents match your search." />
          ) : (
            filteredUfa.map((player) => {
              const asking = computeAskingSalary(player, league.rules)
              return (
                <Card key={player.id}>
                  <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <PlayerListItem
                      player={player}
                      linkTo={`/player/${player.id}`}
                      subtitle={`${player.position} · ${player.age}y · OVR ${player.ratings.overall} · Ask ${fmtMoney(asking)}`}
                      className="flex-1 min-w-0"
                    />
                    {isFA && (
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleOffer(player.id, asking)}
                      >
                        Offer {fmtMoney(asking)}/yr
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {tab === 'rfa' && (
        <div className="space-y-2">
          {filteredRfa.length === 0 ? (
            <EmptyState description="No restricted free agents match your search." />
          ) : (
            filteredRfa.map((player) => {
              const asking = computeAskingSalary(player, league.rules)
              const qo = league.qualifyingOffers.find((q) => q.playerId === player.id)
              return (
                <Card key={player.id}>
                  <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <PlayerListItem
                      player={player}
                      linkTo={`/player/${player.id}`}
                      subtitle={`RFA · QO team: ${qo ? league.teams[qo.teamId]?.abbreviation : '—'} · 7-day match window`}
                      className="flex-1 min-w-0"
                    />
                    {isFA && (
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleOffer(player.id, asking)}
                      >
                        Offer sheet
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="space-y-4">
          {incomingSheets.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Incoming offer sheets (match or let walk)</h3>
              {incomingSheets.map((offer) => {
                const player = league.players[offer.playerId]
                const biddingTeam = league.teams[offer.teamId]
                const daysLeft = Math.max(
                  0,
                  Math.ceil(
                    (new Date(offer.matchDeadline).getTime() -
                      new Date(league.currentDate).getTime()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )
                if (!player) return null
                return (
                  <Card key={offer.id} className="border-amber-500/30">
                    <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <PlayerListItem
                        player={player}
                        linkTo={`/player/${player.id}`}
                        subtitle={`${biddingTeam?.abbreviation ?? 'Unknown'} · ${fmtMoney(offer.salaryByYear[0] ?? 0)}/yr × ${offer.years} · ${daysLeft}d to match`}
                        className="flex-1 min-w-0"
                      />
                      {isFA && (
                        <Button
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            const result = matchOfferSheetAction(offer.id)
                            if (!result.matched) toast.error(result.reason ?? 'Could not match')
                            else toast.success('Offer sheet matched')
                          }}
                        >
                          Match
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">My offers</h3>
            {myOffers.length === 0 ? (
              <EmptyState description="No active offers." />
            ) : (
              myOffers.map((offer) => {
                const player = league.players[offer.playerId]
                const daysLeft = Math.max(
                  0,
                  Math.ceil(
                    (new Date(offer.matchDeadline).getTime() -
                      new Date(league.currentDate).getTime()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )
                if (!player) return null
                return (
                  <Card key={offer.id}>
                    <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <PlayerListItem
                        player={player}
                        linkTo={`/player/${player.id}`}
                        subtitle={`${fmtMoney(offer.salaryByYear[0] ?? 0)}/yr × ${offer.years} · ${formatOfferStatus(offer.status)}${offer.status === 'pending' ? ` · ${daysLeft}d to match` : ''}`}
                        className="flex-1 min-w-0"
                      />
                      <div className="flex gap-2 shrink-0">
                        {offer.status === 'pending' && (
                          <Button size="sm" variant="secondary" onClick={() => withdrawOffer(offer.id)}>
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
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
