import { Link } from 'react-router-dom'
import { PlayerHeadshot } from './PlayerHeadshot'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'

type TeamBasicInfo = Pick<StaticTeam, 'city' | 'name' | 'colors'>

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function PlayerBioCard({
  player,
  team,
}: {
  player: Player
  team?: TeamBasicInfo | null
}) {
  const salary = player.contract.salaryByYear[0] ?? 0
  const height = `${Math.floor(player.heightInches / 12)}'${player.heightInches % 12}"`

  return (
    <div className="flex items-start gap-4 p-4 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)]">
      <PlayerHeadshot player={player} team={team} size={72} />
      <div className="flex-1 min-w-0">
        <div className="font-display text-lg">
          {player.firstName} {player.lastName}
        </div>
        <div className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          {team ? `${team.city} ${team.name}` : 'Free Agent'} · #{player.position} · {height} · {player.weightLbs} lbs
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span>Age {player.age}</span>
          <span className="font-medium">{player.ratings.overall} OVR</span>
          <span>{fmt(salary)}/yr · {player.contract.yearsRemaining} yr</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <Link
          to={`/player/compare?left=${player.id}`}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line-soft)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors"
        >
          Compare
        </Link>
        <Link
          to={`/player/${player.id}`}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line-soft)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors"
        >
          Full Profile
        </Link>
      </div>
    </div>
  )
}
