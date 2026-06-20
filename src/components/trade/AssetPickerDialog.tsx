import { useState } from 'react'
import type { Player } from '@/game/models/player'
import type { DraftPick } from '@/game/models/draft'
import type { TradeAsset } from '@/game/models/trade'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { PickProtectionBadge } from './PickProtectionBadge'

interface AssetPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  players: Player[]
  picks: DraftPick[]
  allowCash?: boolean
  maxCash?: number
  onSelect: (asset: TradeAsset) => void
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  players,
  picks,
  allowCash = true,
  maxCash = 1_000_000,
  onSelect,
}: AssetPickerDialogProps) {
  const [tab, setTab] = useState<'players' | 'picks' | 'cash'>('players')
  const [search, setSearch] = useState('')
  const [cashAmount, setCashAmount] = useState(1_000_000)

  if (!open) return null

  const filteredPlayers = players.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q)
    )
  })

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
                  <div className="text-sm text-[var(--color-muted-foreground)] py-4 text-center">
                    No matching players.
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => {
                        onSelect({ type: 'player', playerId: player.id })
                        onOpenChange(false)
                      }}
                      className="w-full flex items-center gap-3 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-left hover:border-[var(--color-primary)]/40 transition-colors"
                    >
                      <PlayerHeadshot player={player} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm truncate">
                          {player.firstName} {player.lastName}
                        </div>
                        <div className="text-[10px] text-[var(--color-muted-foreground)]">
                          {player.position} • OVR {player.ratings.overall} • Age {player.age}
                        </div>
                      </div>
                      <div className="font-mono text-xs">
                        ${((player.contract.salaryByYear[0] ?? 0) / 1_000_000).toFixed(1)}M
                      </div>
                    </button>
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
                    disabled={pick.stepienBlocked}
                    onClick={() => {
                      onSelect({ type: 'pick', pickId: pick.id })
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
                  onSelect({ type: 'cash', cashAmount })
                  onOpenChange(false)
                }}
                disabled={cashAmount <= 0 || cashAmount > maxCash}
                className="w-full rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                Add ${(cashAmount / 1_000_000).toFixed(1)}M cash
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
