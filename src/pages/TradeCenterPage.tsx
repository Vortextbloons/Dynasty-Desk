import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { TradeBuilder } from '@/components/trade/TradeBuilder'
import { TradeFinder } from '@/components/trade/TradeFinder'

export function TradeCenterPage() {
  const save = useGameStore((s) => s.save)
  const createTradeProposal = useGameStore((s) => s.createTradeProposal)
  const addAssetToTrade = useGameStore((s) => s.addAssetToTrade)
  const removeAssetFromTrade = useGameStore((s) => s.removeAssetFromTrade)
  const submitTrade = useGameStore((s) => s.submitTrade)
  const cancelTradeProposal = useGameStore((s) => s.cancelTradeProposal)
  const addTeamToTrade = useGameStore((s) => s.addTeamToTrade)
  const importProposal = useGameStore((s) => s.importProposal)
  const setPickProtection = useGameStore((s) => s.setPickProtection)

  const [proposalId, setProposalId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')

  const league = save?.league ?? null
  const userTeamId = league?.userTeamId ?? ''
  const allTeams = useMemo(() => Object.values(league?.teams ?? {}), [league])
  const proposal = useMemo(
    () => league?.activeProposals.find((p) => p.id === proposalId) ?? null,
    [league, proposalId],
  )

  function handleStart() {
    if (!selectedTeam) return
    const created = createTradeProposal([userTeamId, selectedTeam])
    if (created) {
      setProposalId(created.id)
    }
  }

  function handleAddTeam() {
    if (!proposal || !selectedTeam) return
    if (proposal.sides.length >= 4) return
    addTeamToTrade(proposal.id, selectedTeam)
  }

  if (!save || !league) {
    return (
      <div>
        <PageHeader
          eyebrow="Season"
          title="Trade Center"
          description="Build a deal. The AI rates it. Accept, reject, or counter — every accepted trade reshapes the league."
        />
        <div className="text-sm text-[var(--color-muted-foreground)]">
          Start a new league to use the trade center.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Season"
        title="Trade Center"
        description="Build a deal. The AI rates it. Accept, reject, or counter."
      />

      {!proposal ? (
        <div className="space-y-4">
          <div className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-2">
              Start a new trade
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="flex-1 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                <option value="">Select a counterparty team...</option>
                {allTeams
                  .filter((t) => t.id !== userTeamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.city} {t.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleStart}
                disabled={!selectedTeam}
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                Build trade
              </button>
            </div>
          </div>

          <TradeFinder
            league={league}
            onSelect={(p) => {
              importProposal(p)
              setProposalId(p.id)
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {proposal.sides.length < 4 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="flex-1 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                <option value="">Add another team (3-4 sides)...</option>
                {allTeams
                  .filter(
                    (t) =>
                      t.id !== userTeamId &&
                      !proposal.sides.some((s) => s.teamId === t.id),
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.city} {t.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleAddTeam}
                disabled={!selectedTeam}
                className="rounded-md border border-[var(--color-line-soft)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)] disabled:opacity-50"
              >
                Add team
              </button>
            </div>
          )}

          <TradeBuilder
            proposal={proposal}
            league={league}
            userTeamId={userTeamId}
            rulesMaxCash={league.rules.maxCashPerSide}
            onAddAsset={(teamId, asset) => {
              addAssetToTrade(proposal.id, teamId, asset)
            }}
            onRemoveAsset={(teamId, idx) => removeAssetFromTrade(proposal.id, teamId, idx)}
            onSaveProtection={(pickId, protection) => setPickProtection(pickId, protection)}
            onSubmit={() => submitTrade(proposal.id)}
            onSaveDraft={() => setProposalId(null)}
            onCancel={() => {
              cancelTradeProposal(proposal.id)
              setProposalId(null)
            }}
          />
        </div>
      )}
    </div>
  )
}
