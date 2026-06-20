import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { PayrollSummaryCard } from '@/components/contracts/PayrollSummaryCard'
import { OwnerCard } from '@/components/contracts/OwnerCard'
import { ExceptionsCard } from '@/components/contracts/ExceptionsCard'
import { ContractTable } from '@/components/contracts/ContractTable'
import { ContractActionDialog } from '@/components/contracts/ContractActionDialog'
import { SignFreeAgentDialog } from '@/components/contracts/SignFreeAgentDialog'
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

  if (!save) {
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

  const { league } = save
  const teamId = league.userTeamId
  const team = league.teams[teamId]
  const userTeam = team

  const rosterPlayers = useMemo(() => {
    if (!userTeam) return []
    return userTeam.roster
      .map((pid) => league.players[pid])
      .filter((p): p is Player => Boolean(p))
  }, [userTeam, league.players])

  const freeAgents = useMemo(() => {
    return Object.values(league.players).filter(
      (p): p is Player => p.teamId === null,
    )
  }, [league.players])

  const softCashWarning = userTeam
    ? userTeam.finances.totalExpenses > 0 &&
      userTeam.finances.ownerCash / userTeam.finances.totalExpenses <
        SOFT_CASH_RATIO_THRESHOLD
    : false

  function handleAction(playerId: string, action: 'cut' | 'stretch' | 'buyout' | 'extend') {
    const player = league.players[playerId]
    if (!player) return
    setSelectedPlayer(player)
    setSelectedAction(action)
    setDialogOpen(true)
  }

  function handleConfirmAction(playerId: string, amount?: number) {
    if (selectedAction === 'cut') {
      cutPlayer(playerId)
    } else if (selectedAction === 'stretch') {
      stretchContract(playerId)
    } else if (selectedAction === 'buyout') {
      buyoutPlayer(playerId, amount ?? 0)
    } else if (selectedAction === 'extend') {
      if (amount !== undefined && selectedPlayer) {
        const years = Math.min(5, Math.max(1, Math.round(amount / 25_000_000)))
        const avgSalary = amount / years
        extendPlayer(playerId, {
          years,
          salaryByYear: Array.from({ length: years }, () => avgSalary),
          option: 'none',
          noTradeClause: false,
        })
      }
    }
    setDialogOpen(false)
    setSelectedPlayer(null)
    setSelectedAction(null)
  }

  function handleSignFreeAgent(playerId: string) {
    const player = league.players[playerId]
    if (!player) return
    setSelectedFreeAgent(player)
    setSignDialogOpen(true)
  }

  function handleConfirmSign(
    playerId: string,
    offer: { years: number; salaryByYear: number[] },
    exception: ExceptionType,
  ) {
    signFreeAgent(playerId, offer, exception)
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

      {userTeam && (
        <>
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
            <div>
              <ContractTable
                players={freeAgents}
                rules={league.rules}
                isUserTeam={false}
                onAction={() => {}}
              />
              {freeAgents.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {freeAgents.map((fa) => (
                    <button
                      key={fa.id}
                      onClick={() => handleSignFreeAgent(fa.id)}
                      className="rounded-md border border-[var(--color-line-soft)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors"
                    >
                      Sign {fa.firstName} {fa.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ContractActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        player={selectedPlayer}
        action={selectedAction}
        rules={league.rules}
        onConfirm={handleConfirmAction}
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
