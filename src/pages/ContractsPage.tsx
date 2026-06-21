import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { PayrollSummaryCard } from '@/components/contracts/PayrollSummaryCard'
import { OwnerCard } from '@/components/contracts/OwnerCard'
import { ExceptionsCard } from '@/components/contracts/ExceptionsCard'
import { TaxBreakdownCard } from '@/components/contracts/TaxBreakdownCard'
import { FrozenPicksWarning } from '@/components/contracts/FrozenPicksWarning'
import { ContractTable } from '@/components/contracts/ContractTable'
import { ContractActionDialog } from '@/components/contracts/ContractActionDialog'
import { SignFreeAgentDialog } from '@/components/contracts/SignFreeAgentDialog'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Player } from '@/game/models/player'
import type { ExceptionType } from '@/game/management/contractActions'
import { SOFT_CASH_RATIO_THRESHOLD } from '@/game/management/financeConstants'

export function ContractsPage() {
  const save = useGameStore((s) => s.save)
  const cutPlayer = useGameStore((s) => s.cutPlayer)
  const stretchContract = useGameStore((s) => s.stretchContract)
  const buyoutPlayer = useGameStore((s) => s.buyoutPlayer)
  const extendPlayer = useGameStore((s) => s.extendPlayer)
  const signFreeAgent = useGameStore((s) => s.signFreeAgent)

  const [tab, setTab] = useState<'roster' | 'free_agents'>('roster')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedAction, setSelectedAction] = useState<
    'cut' | 'stretch' | 'buyout' | 'extend' | null
  >(null)
  const [selectedFreeAgent, setSelectedFreeAgent] = useState<Player | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const league = save?.league ?? null
  const teamId = league?.userTeamId ?? null
  const userTeam = teamId && league ? league.teams[teamId] ?? null : null

  const rosterPlayers = useMemo(() => {
    if (!userTeam || !league) return []
    return userTeam.roster
      .map((pid) => league.players[pid])
      .filter((p): p is Player => Boolean(p))
  }, [userTeam, league])

  const freeAgents = useMemo(() => {
    if (!league) return []
    return Object.values(league.players).filter(
      (p): p is Player => p.teamId === null,
    )
  }, [league])

  if (!save || !league || !userTeam) {
    return (
      <div>
        <PageHeader
          eyebrow="League"
          title="Contracts"
          description="Payroll, cap space, expiring deals, and option flags."
        />
        <div className="text-[var(--color-muted-foreground)] text-sm">
          Start a new league to view contracts.
        </div>
      </div>
    )
  }

  const softCashWarning = userTeam
    ? userTeam.finances.totalExpenses > 0 &&
      userTeam.finances.ownerCash / userTeam.finances.totalExpenses <
        SOFT_CASH_RATIO_THRESHOLD
    : false

  function handleAction(playerId: string, action: 'cut' | 'stretch' | 'buyout' | 'extend') {
    const player = league!.players[playerId]
    if (!player) return
    setSelectedPlayer(player)
    setSelectedAction(action)
    setDialogOpen(true)
  }

  function handleConfirmAction(playerId: string, amount?: number) {
    setActionError(null)
    let result
    if (selectedAction === 'cut') {
      result = cutPlayer(playerId)
    } else if (selectedAction === 'stretch') {
      result = stretchContract(playerId)
    } else if (selectedAction === 'buyout') {
      result = buyoutPlayer(playerId, amount ?? 0)
    }
    if (result && !result.ok) {
      setActionError(result.reason)
      return
    }
    setDialogOpen(false)
    setSelectedPlayer(null)
    setSelectedAction(null)
  }

  function handleConfirmExtend(playerId: string, years: number, avgSalary: number) {
    setActionError(null)
    const result = extendPlayer(playerId, {
      years,
      salaryByYear: Array.from({ length: years }, () => avgSalary),
      option: 'none',
      noTradeClause: false,
    })
    if (!result.ok) {
      setActionError(result.reason)
      return
    }
    setDialogOpen(false)
    setSelectedPlayer(null)
    setSelectedAction(null)
  }

  function handleSignFreeAgent(playerId: string) {
    setActionError(null)
    const player = league!.players[playerId]
    if (!player) return
    setSelectedFreeAgent(player)
    setSignDialogOpen(true)
  }

  function handleConfirmSign(
    playerId: string,
    offer: { years: number; salaryByYear: number[] },
    exception: ExceptionType,
  ) {
    setActionError(null)
    const result = signFreeAgent(playerId, offer, exception)
    if (!result.ok) {
      setActionError(result.reason)
      return
    }
    setSignDialogOpen(false)
    setSelectedFreeAgent(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="League"
        title="Contracts"
        description="Payroll, cap space, expiring deals, and option flags."
      />

      {actionError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {actionError}
        </div>
      )}

      <PayrollSummaryCard
        finances={userTeam.finances}
        rules={league.rules}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <OwnerCard
        owner={userTeam.owner}
        softCashWarning={softCashWarning}
      />
        <ExceptionsCard
          exceptions={userTeam.finances.exceptionsUsed}
          rules={league.rules}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaxBreakdownCard team={userTeam} rules={league.rules} />
        <FrozenPicksWarning
          picks={userTeam.frozenPicks
            .map((id) => league.draftPicks.find((p) => p.id === id))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))}
        />
      </div>

          <div className="border-b border-[var(--color-line-soft)] flex gap-4">
            <button
              onClick={() => setTab('roster')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === 'roster'
                  ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              Roster ({rosterPlayers.length})
            </button>
            <button
              onClick={() => setTab('free_agents')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === 'free_agents'
                  ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              Free Agents ({freeAgents.length})
            </button>
          </div>

          {tab === 'roster' ? (
            <ContractTable
              players={rosterPlayers}
              rules={league.rules}
              isUserTeam={true}
              onAction={handleAction}
            />
          ) : (
            <div className="space-y-2">
              {freeAgents.length === 0 ? (
                <EmptyState description="No unsigned free agents available." />
              ) : (
                freeAgents.map((fa) => (
                  <div
                    key={fa.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-3"
                  >
                    <PlayerListItem
                      player={fa}
                      linkTo={`/player/${fa.id}`}
                      subtitle={`${fa.position} · OVR ${fa.ratings.overall} · Age ${fa.age}`}
                      className="flex-1 min-w-0"
                    />
                    <Button size="sm" className="shrink-0" onClick={() => handleSignFreeAgent(fa.id)}>
                      Sign
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

      <ContractActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        player={selectedPlayer}
        action={selectedAction}
        rules={league.rules}
        onConfirm={handleConfirmAction}
        onConfirmExtend={handleConfirmExtend}
      />

      <SignFreeAgentDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        player={selectedFreeAgent}
        rules={league.rules}
        canUseMLE={!userTeam?.finances.exceptionsUsed.mle}
        canUseBAE={!userTeam?.finances.exceptionsUsed.bae}
        canUseRoomMle={
          !userTeam?.finances.exceptionsUsed.roomMle &&
          userTeam !== undefined &&
          userTeam.finances.payroll < league.rules.salaryCap
        }
        onConfirm={handleConfirmSign}
      />
    </div>
  )
}
