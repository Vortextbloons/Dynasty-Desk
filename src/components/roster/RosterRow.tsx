import { Link } from 'react-router-dom'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { Chip } from '@/components/shared/Chip'
import { FaceIndicator } from '@/components/shared/FaceIndicator'

export interface RosterRowProps {
  player: Player
  team?: StaticTeam | null
}

function fmtCapHit(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function defenseAvg(r: {
  perimeterDefense: number
  interiorDefense: number
  defensiveIq: number
}): number {
  return Math.round(
    (r.perimeterDefense + r.interiorDefense + r.defensiveIq) / 3,
  )
}

function statusVariant(
  status: Player['health']['status'],
): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'healthy') return 'success'
  if (status === 'day_to_day') return 'warning'
  return 'danger'
}

function statusLabel(status: Player['health']['status']): string {
  if (status === 'healthy') return 'Healthy'
  if (status === 'day_to_day') return 'DTD'
  if (status === 'short_term') return 'Out'
  if (status === 'long_term') return 'Out'
  if (status === 'season_ending') return 'Out'
  return 'Out'
}

export function RosterRow({ player, team }: RosterRowProps) {
  const capHit = player.contract.salaryByYear[0] ?? 0
  const isOverCap = capHit > 14_058_800

  return (
    <tr className="border-b border-[var(--color-line-soft)] last:border-b-0 hover:bg-[var(--color-surface-2)]/60">
      <td className="px-3 py-2">
        <Link
          to={`/player/${player.id}`}
          className="flex items-center gap-3 group"
        >
          <PlayerHeadshot player={player} team={team} size={36} />
          <div>
            <div className="font-display text-sm group-hover:text-[var(--color-primary)] transition-colors">
              {player.firstName} {player.lastName}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {team ? `${team.city} ${team.name}` : 'Free Agent'}
            </div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <Chip label={player.position} size="sm" />
          {player.secondaryPositions.map((sp) => (
            <Chip key={sp} label={sp} variant="default" size="sm" />
          ))}
        </div>
      </td>
      <td className="px-3 py-2 font-mono text-center text-sm">{player.age}</td>
      <td className="px-3 py-2 font-mono text-center font-display text-sm">
        {player.ratings.overall}
      </td>
      <td className="px-3 py-2 font-mono text-center text-sm">
        {player.ratings.threePoint}
      </td>
      <td className="px-3 py-2 font-mono text-center text-sm">
        {defenseAvg(player.ratings)}
      </td>
      <td
        className={`px-3 py-2 font-mono text-center text-sm ${isOverCap ? 'text-red-500' : 'text-emerald-500'}`}
      >
        {fmtCapHit(capHit)}
      </td>
      <td className="px-3 py-2 font-mono text-center text-sm">
        {player.contract.yearsRemaining}
      </td>
      <td className="px-3 py-2 text-center">
        {player.contract.option !== 'none' ? (
          <Chip
            label={player.contract.option === 'team' ? 'Team' : 'Player'}
            variant="info"
            size="sm"
          />
        ) : (
          <span className="text-[var(--color-muted-foreground)] text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {player.contract.noTradeClause ? (
          <Chip label="NTC" variant="warning" size="sm" />
        ) : (
          <span className="text-[var(--color-muted-foreground)] text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <Chip
          label={statusLabel(player.health.status)}
          variant={statusVariant(player.health.status)}
          size="sm"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <FaceIndicator value={player.morale.happiness} />
      </td>
      <td className="px-3 py-2 text-right">
        <Link
          to={`/player/${player.id}`}
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          View
        </Link>
      </td>
    </tr>
  )
}
