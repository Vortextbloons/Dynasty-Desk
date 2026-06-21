import { useState, useMemo } from 'react'
import type { Player } from '@/game/models/player'
import type { DraftPick } from '@/game/models/draft'
import type { TradeAsset } from '@/game/models/trade'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { EmptyState } from '@/components/shared/EmptyState'
import { fmtMoney } from '@/lib/format'
import { PickProtectionBadge } from './PickProtectionBadge'

interface TargetTeam {
  id: string
  label: string
}

interface AssetPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  players: Player[]
  picks: DraftPick[]
  allowCash?: boolean
  maxCash?: number
  targetTeams?: TargetTeam[]
  defaultTargetTeamId?: string
  onSelect: (asset: TradeAsset) => void
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  players,
  picks,
  allowCash = true,
  maxCash = 1_000_000,
  targetTeams,
  defaultTargetTeamId,
  onSelect,
}: AssetPickerDialogProps) {
  const [tab, setTab] = useState<'players' | 'picks' | 'cash'>('players')
  const [search, setSearch] = useState('')
  const [cashAmount, setCashAmount] = useState(1_000_000)
  const [targetTeamId, setTargetTeamId] = useState<string>(
    defaultTargetTeamId ?? targetTeams?.[0]?.id ?? '',
  )

  const requiresTarget = (targetTeams?.length ?? 0) > 1
  const targetTeamMap = useMemo(() => {
    const map = new Map<string, TargetTeam>()
    for (const t of targetTeams ?? []) map.set(t.id, t)
    return map
  }, [targetTeams])

  if (!open) return null

  const filteredPlayers = players.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q)
    )
  })

  function withTarget(asset: TradeAsset): TradeAsset {
    if (!requiresTarget) return asset
    return { ...asset, toTeamId: targetTeamId }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardContent className="p-5 flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base">Add to trade</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              Close
            </button>
          </div>

          {requiresTarget && targetTeams && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-1">
                Send to
              </div>
              <select
                value={targetTeamId}
                onChange={(e) => setTargetTeamId(e.target.value)}
                className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                {targetTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex border-b border-[var(--color-line-soft)] gap-4">
            {(['players', 'picks', 'cash'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
                    : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                {t === 'players' ? 'Players' : t === 'picks' ? 'Picks' : 'Cash'}
              </button>
            ))}
          </div>

          {tab === 'players' && (
            <>
              <input
                type="text"
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              />
              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredPlayers.length === 0 ? (
                  <EmptyState description="No matching players." />
                ) : (
                  filteredPlayers.map((player) => (
                    <PlayerListItem
                      key={player.id}
                      player={player}
                      subtitle={`${player.position} • OVR ${player.ratings.overall} • Age ${player.age}`}
                      disabled={requiresTarget && !targetTeamId}
                      onClick={() => {
                        onSelect(withTarget({ type: 'player', playerId: player.id }))
                        onOpenChange(false)
                      }}
                      trailing={
                        <div className="font-mono text-xs">
                          {fmtMoney(player.contract.salaryByYear[0] ?? 0)}
                        </div>
                      }
                      className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 hover:border-[var(--color-primary)]/40 disabled:opacity-50"
                    />
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'picks' && (
            <div className="flex-1 overflow-y-auto space-y-1">
              {picks.length === 0 ? (
                <div className="text-sm text-[var(--color-muted-foreground)] py-4 text-center">
                  No picks available.
                </div>
              ) : (
                picks.map((pick) => (
                  <button
                    key={pick.id}
                    disabled={pick.stepienBlocked ? true : (requiresTarget && !targetTeamId)}
                    onClick={() => {
                      onSelect(withTarget({ type: 'pick', pickId: pick.id }))
                      onOpenChange(false)
                    }}
                    className="w-full flex items-center justify-between rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-left hover:border-[var(--color-primary)]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="font-display text-sm">
                        {pick.season} • Round {pick.round} • #{pick.pickNumber}
                      </div>
                    </div>
                    <PickProtectionBadge
                      protection={pick.protected}
                      stepienBlocked={pick.stepienBlocked}
                      frozenUntilSeason={pick.frozenUntilSeason}
                    />
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'cash' && allowCash && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)]">
                  Cash amount (max ${(maxCash / 1_000_000).toFixed(1)}M)
                </label>
                <input
                  type="number"
                  min={0}
                  max={maxCash}
                  step={100_000}
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="w-full mt-1 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm font-mono"
                />
              </div>
              <button
                onClick={() => {
                  onSelect(withTarget({ type: 'cash', cashAmount }))
                  onOpenChange(false)
                }}
                disabled={cashAmount <= 0 || cashAmount > maxCash || (requiresTarget && !targetTeamId)}
                className="w-full rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                Add ${(cashAmount / 1_000_000).toFixed(1)}M cash
                {requiresTarget && targetTeamId && targetTeamMap.has(targetTeamId)
                  ? ` to ${targetTeamMap.get(targetTeamId)!.label}`
                  : ''}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
