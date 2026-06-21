import { useState } from 'react'
import type { Player } from '@/game/models/player'
import type { Contract } from '@/game/models/contract'
import type { LeagueRules } from '@/game/models/leagueRules'
import { computeCapHit } from '@/game/management/capEngine'
import { ChevronDown, ChevronUp } from 'lucide-react'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

type SortKey = 'name' | 'salary' | 'years' | 'capHit' | 'option' | 'guaranteed'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== col) return null
  return sortDir === 'asc' ? (
    <ChevronUp className="inline size-3 ml-0.5" />
  ) : (
    <ChevronDown className="inline size-3 ml-0.5" />
  )
}

interface ContractTableProps {
  players: Player[]
  rules: LeagueRules
  isUserTeam: boolean
  onAction: (playerId: string, action: 'cut' | 'stretch' | 'buyout' | 'extend') => void
}

export function ContractTable({
  players,
  rules,
  isUserTeam,
  onAction,
}: ContractTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('salary')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...players].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'name':
        cmp = `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        )
        break
      case 'salary':
        cmp = (a.contract.salaryByYear[0] ?? 0) - (b.contract.salaryByYear[0] ?? 0)
        break
      case 'years':
        cmp = a.contract.yearsRemaining - b.contract.yearsRemaining
        break
      case 'capHit':
        cmp = computeCapHit(a, rules) - computeCapHit(b, rules)
        break
      case 'option':
        cmp = a.contract.option.localeCompare(b.contract.option)
        break
      case 'guaranteed':
        cmp = (a.contract.guaranteed ? 1 : 0) - (b.contract.guaranteed ? 1 : 0)
        break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line-soft)] text-left text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            <th className="pb-2 pr-4 cursor-pointer select-none" onClick={() => toggleSort('name')}>
              Player<SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className="pb-2 pr-4 text-right cursor-pointer select-none" onClick={() => toggleSort('salary')}>
              Salary<SortIcon col="salary" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className="pb-2 pr-4 text-right cursor-pointer select-none" onClick={() => toggleSort('years')}>
              Years<SortIcon col="years" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className="pb-2 pr-4 text-right cursor-pointer select-none" onClick={() => toggleSort('capHit')}>
              Cap Hit<SortIcon col="capHit" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className="pb-2 pr-4 text-center cursor-pointer select-none" onClick={() => toggleSort('option')}>
              Option<SortIcon col="option" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className="pb-2 pr-4 text-center cursor-pointer select-none" onClick={() => toggleSort('guaranteed')}>
              Guaranteed<SortIcon col="guaranteed" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className="pb-2 text-center">NTC</th>
            {isUserTeam && <th className="pb-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((player) => (
            <ContractRow
              key={player.id}
              player={player}
              rules={rules}
              isUserTeam={isUserTeam}
              onAction={onAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContractRow({
  player,
  rules,
  isUserTeam,
  onAction,
}: {
  player: Player
  rules: LeagueRules
  isUserTeam: boolean
  onAction: (playerId: string, action: 'cut' | 'stretch' | 'buyout' | 'extend') => void
}) {
  const c: Contract = player.contract
  const capHit = computeCapHit(player, rules)
  const isExpiring = c.yearsRemaining <= 1

  return (
    <tr className="border-b border-[var(--color-line-soft)] hover:bg-[var(--color-surface-2)]/50 transition-colors">
      <td className="py-2.5 pr-4">
        <div className="font-medium">
          {player.firstName} {player.lastName}
        </div>
        <div className="text-[10px] text-[var(--color-muted-foreground)]">
          {player.position} · Age {player.age}
        </div>
      </td>
      <td className="py-2.5 pr-4 text-right font-mono text-sm">
        {fmt(c.salaryByYear[0] ?? 0)}
      </td>
      <td className="py-2.5 pr-4 text-center font-mono text-sm">
        {c.yearsRemaining}
      </td>
      <td className="py-2.5 pr-4 text-right font-mono text-sm font-medium">
        {fmt(capHit)}
      </td>
      <td className="py-2.5 pr-4 text-center">
        {c.option !== 'none' && (
          <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            {c.option === 'player' ? 'PO' : 'TO'}
          </span>
        )}
      </td>
      <td className="py-2.5 pr-4 text-center">
        {c.guaranteed ? (
          <span className="text-emerald-500 text-xs">Yes</span>
        ) : (
          <span className="text-[var(--color-muted-foreground)] text-xs">No</span>
        )}
      </td>
      <td className="py-2.5 text-center">
        {c.noTradeClause && (
          <span className="text-amber-500 text-xs font-medium">NTC</span>
        )}
      </td>
      {isUserTeam && (
        <td className="py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            {isExpiring ? (
              <ActionBtn label="Extend" onClick={() => onAction(player.id, 'extend')} />
            ) : (
              <>
                <ActionBtn label="Cut" onClick={() => onAction(player.id, 'cut')} variant="danger" />
                <ActionBtn label="Stretch" onClick={() => onAction(player.id, 'stretch')} />
                <ActionBtn label="Buyout" onClick={() => onAction(player.id, 'buyout')} />
                <ActionBtn label="Extend" onClick={() => onAction(player.id, 'extend')} />
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}

function ActionBtn({
  label,
  onClick,
  variant,
}: {
  label: string
  onClick: () => void
  variant?: 'danger'
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
        variant === 'danger'
          ? 'border-red-500/30 text-red-500 hover:bg-red-500/10'
          : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]'
      }`}
    >
      {label}
    </button>
  )
}
