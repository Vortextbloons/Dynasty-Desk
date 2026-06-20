import { useMemo } from 'react'
import type { Team } from '@/game/models/team'
import type { LeagueState } from '@/game/models/league'
import type { TradeProposal, TradeAsset } from '@/game/models/trade'
import { validateTradeLegality } from '@/game/management/tradeEngine'
import { computeTradeValueDelta } from '@/game/management/tradeValueModel'
import { evaluateTradeForAI } from '@/game/management/tradeAI'
import { TradeSideColumn } from './TradeSideColumn'
import { SalaryMatchBar } from './SalaryMatchBar'
import { AIInterestMeter } from './AIInterestMeter'

interface TradeBuilderProps {
  proposal: TradeProposal
  league: LeagueState
  userTeamId: string
  rulesMaxCash: number
  onAddAsset: (teamId: string, asset: TradeAsset) => void
  onRemoveAsset: (teamId: string, index: number) => void
  onSubmit: () => {
    accepted: boolean
    counterOffer?: TradeProposal
    rejectionReason?: string
    vetoReason?: string
    vetoingOwnerName?: string
  }
  onCancel: () => void
  onSaveDraft: () => void
}

function computeApronStatusLocal(team: Team, rules: LeagueState['rules']): 'below' | 'first' | 'second' {
  if (team.finances.payroll >= rules.secondApron) return 'second'
  if (team.finances.payroll >= rules.apron) return 'first'
  return 'below'
}

export function TradeBuilder({
  proposal,
  league,
  userTeamId,
  rulesMaxCash,
  onAddAsset,
  onRemoveAsset,
  onSubmit,
  onCancel,
  onSaveDraft,
}: TradeBuilderProps) {
  const allPlayers = useMemo(() => Object.values(league.players), [league.players])
  const allPicks = useMemo(() => league.draftPicks, [league.draftPicks])

  const teams = proposal.sides.map((s) => league.teams[s.teamId]).filter(Boolean) as Team[]

  const legality = validateTradeLegality(proposal, league, league.rules)

  const projectedWins: Record<string, number> = {}
  for (const [tid, standing] of Object.entries(league.standings)) {
    projectedWins[tid] = standing.wins || 41
  }

  const aiSide = proposal.sides.find((s) => s.teamId !== userTeamId)
  const aiTeam = aiSide ? league.teams[aiSide.teamId] : null
  const aiResponse = useMemo(() => {
    if (!aiTeam) return null
    return evaluateTradeForAI(proposal, aiTeam, {
      projectedWins,
      userTeamId,
      league,
    })
  }, [proposal, aiTeam, projectedWins, userTeamId, league])

  const { perSideValue } = computeTradeValueDelta(
    proposal.sides,
    (id) => league.teams[id],
    (id) => league.players[id],
    (id) => league.draftPicks.find((p) => p.id === id),
    projectedWins,
    { teamDirection: 'middle', positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 } },
  )

  const userDelta = perSideValue[userTeamId]?.delta ?? null

  let salarySummary: { outgoing: number; incoming: number; rule: string; legal: boolean } | null = null
  if (proposal.sides.length === 2 && teams.length === 2) {
    const userSide = proposal.sides.find((s) => s.teamId === userTeamId)
    const otherSide = proposal.sides.find((s) => s.teamId !== userTeamId)
    if (userSide && otherSide) {
      const userTeam = league.teams[userTeamId]!
      const otherTeam = league.teams[otherSide.teamId]!
      const userOutSalary = sumOutgoingSalary(userSide, league)
      const userInSalary = sumIncomingSalary(otherSide.outgoing, league)
      const apron = computeApronStatusLocal(userTeam, league.rules)
      const ruleLabel = apron === 'second' ? '2nd apron' : apron === 'first' ? '1st apron (110%)' : 'Below apron (175% + 7.5M)'
      const legal = apron === 'second'
        ? userInSalary <= userOutSalary
        : apron === 'first'
        ? userInSalary <= userOutSalary * 1.1
        : userOutSalary <= 7_500_000
        ? userInSalary <= userOutSalary * 1.75 + 7_500_000
        : userOutSalary <= 29_000_000
        ? userInSalary <= userOutSalary + 7_500_000
        : userInSalary <= userOutSalary * 1.25
      void otherTeam
      salarySummary = {
        outgoing: userOutSalary,
        incoming: userInSalary,
        rule: ruleLabel,
        legal,
      }
    }
  }

  function handleSubmit() {
    const result = onSubmit()
    if (result.vetoReason) {
      // eslint-disable-next-line no-alert
      alert(`Vetoed: ${result.vetoReason}`)
    } else if (result.counterOffer) {
      // eslint-disable-next-line no-alert
      alert('AI proposed a counter-offer — check the active proposals.')
    } else if (result.rejectionReason) {
      // eslint-disable-next-line no-alert
      alert(`Rejected: ${result.rejectionReason}`)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`grid gap-4 ${
          proposal.sides.length === 2
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {proposal.sides.map((side) => {
          const team = league.teams[side.teamId]
          if (!team) return null
          const isUserSide = side.teamId === userTeamId
          const targetTeams = isUserSide
            ? proposal.sides
                .filter((s) => s.teamId !== side.teamId)
                .map((s) => {
                  const t = league.teams[s.teamId]
                  return {
                    id: s.teamId,
                    label: t ? `${t.city} ${t.name}` : s.teamId,
                  }
                })
            : proposal.sides
                .filter((s) => s.teamId !== side.teamId)
                .map((s) => {
                  const t = league.teams[s.teamId]
                  return {
                    id: s.teamId,
                    label: t ? `${t.city} ${t.name}` : s.teamId,
                  }
                })
          const defaultTargetTeamId = isUserSide
            ? targetTeams[0]?.id
            : targetTeams.find((t) => t.id === userTeamId)?.id ?? targetTeams[0]?.id
          return (
            <TradeSideColumn
              key={side.teamId}
              side={side}
              team={team}
              players={allPlayers}
              picks={allPicks}
              isUserSide={isUserSide}
              rulesMaxCash={rulesMaxCash}
              allowCash={league.rules.allowCashInTrades}
              targetTeams={targetTeams}
              defaultTargetTeamId={defaultTargetTeamId}
              allTeams={teams}
              onAdd={(asset) => onAddAsset(side.teamId, asset)}
              onRemove={(idx) => onRemoveAsset(side.teamId, idx)}
            />
          )
        })}
      </div>

      {salarySummary && (
        <SalaryMatchBar
          outgoing={salarySummary.outgoing}
          incoming={salarySummary.incoming}
          rule={salarySummary.rule}
          legal={salarySummary.legal}
        />
      )}

      <AIInterestMeter
        delta={userDelta}
        legalityLegal={legality.legal}
        rejectionReason={aiResponse?.kind === 'rejected' ? aiResponse.reason : legality.reason}
        vetoReason={aiResponse?.kind === 'vetoed' ? aiResponse.reason : undefined}
        vetoingOwnerName={aiResponse?.kind === 'vetoed' ? aiResponse.vetoingOwnerName : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!legality.legal}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
        >
          Submit trade
        </button>
        <button
          onClick={onSaveDraft}
          className="rounded-md border border-[var(--color-line-soft)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)]"
        >
          Save draft
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function sumOutgoingSalary(
  side: TradeProposal['sides'][number],
  league: LeagueState,
): number {
  let total = 0
  for (const asset of side.outgoing) {
    if (asset.type === 'player' && asset.playerId) {
      const p = league.players[asset.playerId]
      if (p) total += p.contract.salaryByYear[0] ?? 0
    }
  }
  return total
}

function sumIncomingSalary(
  incoming: TradeProposal['sides'][number]['outgoing'],
  league: LeagueState,
): number {
  let total = 0
  for (const asset of incoming) {
    if (asset.type === 'player' && asset.playerId) {
      const p = league.players[asset.playerId]
      if (p) total += p.contract.salaryByYear[0] ?? 0
    }
  }
  return total
}
