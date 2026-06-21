import type { PlayerGameStats } from '@/game/models'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { PlayerListItem } from '@/components/shared/PlayerListItem'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  players: PlayerGameStats[]
  playerLookup: Map<string, { firstName: string; lastName: string; position: string; externalId?: string }>
  title: string
}

function fmt(n: number): string {
  if (n === 0) return '0'
  if (Math.abs(n) >= 10) return n.toFixed(0)
  return n.toFixed(1)
}

export function BoxScoreTable({ players, playerLookup, title }: Props) {
  const sorted = [...players]
    .filter((p) => p.minutes > 0 || p.points > 0)
    .sort((a, b) => b.points - a.points)

  return (
    <div className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)]">
      <div className="border-b border-[var(--color-line-soft)] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {title}
      </div>

      <div className="md:hidden divide-y divide-[var(--color-line-soft)]">
        {sorted.length === 0 ? (
          <EmptyState description="No players recorded minutes." />
        ) : (
          sorted.map((p) => {
            const meta = playerLookup.get(p.playerId)
            if (!meta) return null
            return (
              <PlayerListItem
                key={p.playerId}
                player={{ ...meta, id: p.playerId }}
                subtitle={`${fmt(p.minutes)} MIN · ${p.totalRebounds} REB · ${p.assists} AST`}
                trailing={
                  <span className="font-display text-lg tabular-nums">{p.points}</span>
                }
                className="px-3 py-2.5"
              />
            )
          })
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              <th className="px-3 py-2 text-left font-medium sticky left-0 z-10 bg-[var(--color-surface-1)] min-w-[160px]">
                Player
              </th>
              <th className="px-2 py-2 text-right font-medium">MIN</th>
              <th className="px-2 py-2 text-right font-medium">PTS</th>
              <th className="px-2 py-2 text-right font-medium">REB</th>
              <th className="px-2 py-2 text-right font-medium">AST</th>
              <th className="px-2 py-2 text-right font-medium">STL</th>
              <th className="px-2 py-2 text-right font-medium">BLK</th>
              <th className="px-2 py-2 text-right font-medium">TOV</th>
              <th className="px-2 py-2 text-right font-medium">FG</th>
              <th className="px-2 py-2 text-right font-medium">3PT</th>
              <th className="px-2 py-2 text-right font-medium">FT</th>
              <th className="px-2 py-2 text-right font-medium">PF</th>
              <th className="px-2 py-2 text-right font-medium">+/-</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const meta = playerLookup.get(p.playerId)
              const name = meta ? `${meta.firstName} ${meta.lastName}` : p.playerId
              const fg = `${p.fgm}-${p.fga}`
              const tp = `${p.tpm}-${p.tpa}`
              const ft = `${p.ftm}-${p.fta}`
              return (
                <tr
                  key={p.playerId}
                  className="border-t border-[var(--color-line-soft)]/50 hover:bg-[var(--color-surface-2)]"
                >
                  <td className="px-3 py-1.5 font-medium sticky left-0 z-10 bg-inherit min-w-[160px]">
                    <div className="flex items-center gap-2">
                      {meta ? (
                        <PlayerHeadshot
                          player={{
                            firstName: meta.firstName,
                            lastName: meta.lastName,
                            externalId: meta.externalId,
                          }}
                          size={24}
                        />
                      ) : null}
                      <span>{name}</span>
                      {meta && (
                        <span className="text-[10px] text-[var(--color-muted-foreground)]">
                          {meta.position}
                        </span>
                      )}
                      {p.started && (
                        <span className="rounded bg-[var(--color-surface-3)] px-1 text-[9px] uppercase tracking-wide">
                          ST
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(p.minutes)}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{p.points}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{p.totalRebounds}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{p.assists}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{p.steals}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{p.blocks}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{p.turnovers}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fg}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{tp}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{ft}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{p.fouls}</td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono ${
                      p.plusMinus > 0
                        ? 'text-emerald-500'
                        : p.plusMinus < 0
                          ? 'text-red-500'
                          : ''
                    }`}
                  >
                    {p.plusMinus > 0 ? `+${p.plusMinus}` : p.plusMinus}
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={13}
                  className="px-3 py-4 text-center text-[var(--color-muted-foreground)]"
                >
                  No players recorded minutes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
