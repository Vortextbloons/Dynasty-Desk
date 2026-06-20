import { useState } from 'react'
import type { Player } from '@/game/models/player'
import type { DraftPick } from '@/game/models/draft'
import type { Team } from '@/game/models/team'
import type { TradeAsset, TradeSide } from '@/game/models/trade'
import { Card, CardContent } from '@/components/ui/card'
import { Chip } from '@/components/shared/Chip'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { PickProtectionBadge } from './PickProtectionBadge'
import { AssetPickerDialog } from './AssetPickerDialog'

interface TradeSideColumnProps {
  side: TradeSide
  team: Team
  players: Player[]
  picks: DraftPick[]
  isUserSide: boolean
  rulesMaxCash: number
  onAdd: (asset: TradeAsset) => void
  onRemove: (index: number) => void
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function TradeSideColumn({
  side,
  team,
  players,
  picks,
  isUserSide,
  rulesMaxCash,
  onAdd,
  onRemove,
}: TradeSideColumnProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const playerMap = new Map(players.map((p) => [p.id, p]))
  const pickMap = new Map(picks.map((p) => [p.id, p]))

  const outgoing = side.outgoing
  const incoming = side.incoming

  const outgoingSalary = outgoing.reduce((sum, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const p = playerMap.get(asset.playerId)
      return sum + (p ? (p.contract.salaryByYear[0] ?? 0) : 0)
    }
    return sum
  }, 0)
  const incomingSalary = incoming.reduce((sum, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const p = playerMap.get(asset.playerId)
      return sum + (p ? (p.contract.salaryByYear[0] ?? 0) : 0)
    }
    return sum
  }, 0)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              {isUserSide ? 'Your team' : 'Counterparty'}
            </div>
            <div className="font-display text-base flex items-center gap-2">
              {team.city} {team.name}
              <Chip label={team.direction} size="sm" variant="default" />
            </div>
          </div>
          <div
            className="size-3 rounded-full"
            style={{ background: team.colors.primary }}
            aria-hidden
          />
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-[0.22em] text-amber-500">
                Outgoing ({fmt(outgoingSalary)})
              </div>
              {isUserSide && (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="text-[10px] text-[var(--color-primary)] hover:underline"
                >
                  + Add
                </button>
              )}
            </div>
            <div className="space-y-1">
              {outgoing.length === 0 ? (
                <div className="text-xs text-[var(--color-muted-foreground)] italic">
                  No outgoing assets.
                </div>
              ) : (
                outgoing.map((asset, i) => (
                  <AssetRow
                    key={i}
                    asset={asset}
                    playerMap={playerMap}
                    pickMap={pickMap}
                    isUserSide={isUserSide}
                    onRemove={() => onRemove(i)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="border-t border-[var(--color-line-soft)] pt-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-sky-500 mb-1">
              Incoming ({fmt(incomingSalary)})
            </div>
            <div className="space-y-1">
              {incoming.length === 0 ? (
                <div className="text-xs text-[var(--color-muted-foreground)] italic">
                  Nothing incoming yet.
                </div>
              ) : (
                incoming.map((asset, i) => (
                  <AssetRow
                    key={i}
                    asset={asset}
                    playerMap={playerMap}
                    pickMap={pickMap}
                    isUserSide={false}
                    onRemove={() => undefined}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {isUserSide && (
        <AssetPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          players={team.roster
            .map((id) => playerMap.get(id))
            .filter((p): p is Player => Boolean(p))}
          picks={picks.filter((p) => p.currentTeamId === team.id)}
          allowCash
          maxCash={rulesMaxCash}
          onSelect={onAdd}
        />
      )}
    </Card>
  )
}

function AssetRow({
  asset,
  playerMap,
  pickMap,
  isUserSide,
  onRemove,
}: {
  asset: TradeAsset
  playerMap: Map<string, Player>
  pickMap: Map<string, DraftPick>
  isUserSide: boolean
  onRemove: () => void
}) {
  if (asset.type === 'player' && asset.playerId) {
    const player = playerMap.get(asset.playerId)
    if (!player) return null
    return (
      <div className="flex items-center gap-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 py-1.5">
        <PlayerHeadshot player={player} size={28} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-xs truncate">
            {player.firstName} {player.lastName}
          </div>
          <div className="text-[10px] text-[var(--color-muted-foreground)]">
            {player.position} • OVR {player.ratings.overall}
          </div>
        </div>
        {player.contract.noTradeClause && <Chip label="NTC" variant="warning" size="sm" />}
        <div className="font-mono text-xs">
          {fmt(player.contract.salaryByYear[0] ?? 0)}
        </div>
        {isUserSide && (
          <button
            onClick={onRemove}
            className="text-[10px] text-red-500 hover:underline ml-1"
          >
            ×
          </button>
        )}
      </div>
    )
  }
  if (asset.type === 'pick' && asset.pickId) {
    const pick = pickMap.get(asset.pickId)
    if (!pick) return null
    return (
      <div className="flex items-center justify-between rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 py-1.5">
        <div className="text-xs">
          {pick.season} • Rd {pick.round} • #{pick.pickNumber}
        </div>
        <div className="flex items-center gap-2">
          <PickProtectionBadge
            protection={pick.protected}
            stepienBlocked={pick.stepienBlocked}
            frozenUntilSeason={pick.frozenUntilSeason}
          />
          {isUserSide && (
            <button
              onClick={onRemove}
              className="text-[10px] text-red-500 hover:underline"
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }
  if (asset.type === 'cash') {
    return (
      <div className="flex items-center justify-between rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 py-1.5">
        <div className="text-xs">Cash</div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs">{fmt(asset.cashAmount ?? 0)}</div>
          {isUserSide && (
            <button
              onClick={onRemove}
              className="text-[10px] text-red-500 hover:underline"
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }
  return null
}
