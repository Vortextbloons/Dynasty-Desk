import { Link, useNavigate } from 'react-router-dom'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { Chip } from '@/components/shared/Chip'
import { HealthBadge } from '@/components/health/HealthBadge'
import { FatigueBar } from '@/components/fatigue/FatigueBar'

export interface RosterRowProps {
  player: Player
  team?: StaticTeam | null
}

function fmtCapHit(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function computeTradeValue(overall: number, age: number): number {
  let value = overall * 0.5
  if (age < 25) value += 6
  if (age > 28) value -= 4
  return Math.round(value * 10) / 10
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

export function RosterRow({ player, team }: RosterRowProps) {
  const capHit = player.contract.salaryByYear[0] ?? 0
  const isOverCap = capHit > 14_058_800
  const tradeValue = computeTradeValue(player.ratings.overall, player.age)
  const navigate = useNavigate()

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
        {tradeValue.toFixed(1)}
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
        <div className="flex justify-center">
          <HealthBadge health={player.health} />
        </div>
      </td>
      <td className="px-3 py-2">
        <FatigueBar fatigue={player.fatigue} />
      </td>
      <td className="px-3 py-2 font-mono text-center text-sm">
        {player.morale.happiness}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(`/trades?player=${player.id}`)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Trade
          </button>
          <Link
            to={`/player/${player.id}`}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            View
          </Link>
        </div>
      </td>
    </tr>
  )
}
