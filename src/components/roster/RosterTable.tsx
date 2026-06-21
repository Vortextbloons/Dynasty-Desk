import { Card, CardContent } from '@/components/ui/card'
import { RosterRow } from './RosterRow'
import { RosterEmptyState } from './RosterEmptyState'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { fmtMoney } from '@/lib/format'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'
import { cn } from '@/lib/utils'

export interface RosterTableProps {
  players: Player[]
  teams?: StaticTeam[]
  sortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  hasSave: boolean
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: 'asc' | 'desc'
}) {
  return (
    <th className="text-left px-3 py-2 font-medium">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-[var(--color-foreground)]"
      >
        {children}
        {active ? (
          <span aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span>
        ) : null}
      </button>
    </th>
  )
}

const COLUMNS: { key: string; label: string; align?: 'left' | 'center' | 'right' }[] = [
  { key: 'name', label: 'Player' },
  { key: 'position', label: 'Pos', align: 'center' },
  { key: 'age', label: 'Age', align: 'center' },
  { key: 'overall', label: 'OVR', align: 'center' },
  { key: 'threePoint', label: '3PT', align: 'center' },
  { key: 'defense', label: 'DEF', align: 'center' },
  { key: 'capHit', label: 'Cap Hit', align: 'center' },
  { key: 'tradeValue', label: 'Trade V', align: 'center' },
  { key: 'yearsRemaining', label: 'Years', align: 'center' },
  { key: 'option', label: 'Option', align: 'center' },
  { key: 'ntc', label: 'NTC', align: 'center' },
  { key: 'status', label: 'Health', align: 'center' },
  { key: 'fatigue', label: 'Fatigue', align: 'center' },
  { key: 'morale', label: 'Morale', align: 'center' },
  { key: 'action', label: 'Action', align: 'right' },
]

export function RosterTable({
  players,
  teams = [],
  sortKey,
  sortDir,
  onSort,
  hasSave,
}: RosterTableProps) {
  if (players.length === 0) {
    return <RosterEmptyState hasSave={hasSave} />
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="md:hidden divide-y divide-[var(--color-line-soft)]">
          {players.map((player) => {
            const team = teams.find((t) => t.id === player.teamId)
            return (
              <PlayerListItem
                key={player.id}
                player={player}
                team={team}
                linkTo={`/player/${player.id}`}
                subtitle={`${player.position} · OVR ${player.ratings.overall}`}
                trailing={
                  <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
                    {fmtMoney(player.contract.salaryByYear[0] ?? 0)}
                  </span>
                }
                className="px-4 py-3"
              />
            )
          })}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] border-b border-[var(--color-line-soft)]">
                {COLUMNS.map((col) => {
                  if (col.key === 'action') {
                    return (
                      <th
                        key={col.key}
                        className="px-3 py-2 font-medium text-right"
                      >
                        {col.label}
                      </th>
                    )
                  }
                  if (col.key === 'name') {
                    return (
                      <th
                        key={col.key}
                        className="text-left px-3 py-2 font-medium sticky left-0 z-10 bg-[var(--color-surface-1)] min-w-[200px]"
                      >
                        <button
                          type="button"
                          onClick={() => onSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-[var(--color-foreground)]"
                        >
                          {col.label}
                          {sortKey === col.key ? (
                            <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>
                          ) : null}
                        </button>
                      </th>
                    )
                  }
                  if (col.key === 'ntc' || col.key === 'status' || col.key === 'tradeValue') {
                    return (
                      <th
                        key={col.key}
                        className={cn(
                          'px-3 py-2 font-medium',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                        )}
                      >
                        {col.label}
                      </th>
                    )
                  }
                  return (
                    <Th
                      key={col.key}
                      onClick={() => onSort(col.key)}
                      active={sortKey === col.key}
                      dir={sortDir}
                    >
                      {col.label}
                    </Th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const team = teams.find((t) => t.id === player.teamId)
                return (
                  <RosterRow key={player.id} player={player} team={team} />
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
