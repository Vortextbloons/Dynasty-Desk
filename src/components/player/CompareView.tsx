import { Link } from 'react-router-dom'
import { PlayerHeadshot } from './PlayerHeadshot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'
import type { PlayerRatings } from '@/game/models/ratings'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const RATING_GROUPS: { label: string; keys: { key: keyof PlayerRatings; label: string }[] }[] = [
  {
    label: 'Scoring',
    keys: [
      { key: 'insideScoring', label: 'Inside' },
      { key: 'closeShot', label: 'Close' },
      { key: 'midrange', label: 'Mid' },
      { key: 'threePoint', label: '3PT' },
      { key: 'freeThrow', label: 'FT' },
    ],
  },
  {
    label: 'Playmaking',
    keys: [
      { key: 'ballHandling', label: 'Handle' },
      { key: 'passing', label: 'Pass' },
      { key: 'offensiveIq', label: 'O-IQ' },
    ],
  },
  {
    label: 'Defense',
    keys: [
      { key: 'perimeterDefense', label: 'Perim' },
      { key: 'interiorDefense', label: 'Paint' },
      { key: 'steal', label: 'Steal' },
      { key: 'block', label: 'Block' },
      { key: 'defensiveIq', label: 'D-IQ' },
    ],
  },
  {
    label: 'Athletic',
    keys: [
      { key: 'speed', label: 'Speed' },
      { key: 'strength', label: 'Str' },
      { key: 'vertical', label: 'Vert' },
    ],
  },
]

function PlayerSide({
  player,
  team,
  label,
}: {
  player: Player
  team?: StaticTeam | null
  label: string
}) {
  const height = `${Math.floor(player.heightInches / 12)}'${player.heightInches % 12}"`
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <PlayerHeadshot player={player} team={team} size={56} />
        <div>
          <div className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-[0.18em]">{label}</div>
          <Link to={`/player/${player.id}`} className="font-display text-lg hover:text-[var(--color-primary)] transition-colors">
            {player.firstName} {player.lastName}
          </Link>
          <div className="text-sm text-[var(--color-muted-foreground)]">
            {team ? `${team.city} ${team.name}` : 'Free Agent'} · {player.position} · {height}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Age: {player.age}</div>
        <div>OVR: <span className="font-display font-medium">{player.ratings.overall}</span></div>
        <div>Contract: {fmt(player.contract.salaryByYear[0] ?? 0)}/yr</div>
        <div>Years: {player.contract.yearsRemaining}</div>
      </div>
    </div>
  )
}

function SideBySideRatings({ left, right }: { left: PlayerRatings; right: PlayerRatings }) {
  return (
    <div className="space-y-4">
      {RATING_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader>
            <CardTitle className="text-sm font-display tracking-wide">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.keys.map((k) => (
              <div key={k.key} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                <div className="text-right font-mono">{left[k.key]}</div>
                <div className="w-20 text-center text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">{k.label}</div>
                <div className="font-mono">{right[k.key]}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SideBySideStats({ left, right }: { left: Player; right: Player }) {
  const stats = [
    { label: 'PPG', left: left.seasonStats.points / Math.max(1, left.seasonStats.gamesPlayed), right: right.seasonStats.points / Math.max(1, right.seasonStats.gamesPlayed) },
    { label: 'RPG', left: left.seasonStats.rebounds / Math.max(1, left.seasonStats.gamesPlayed), right: right.seasonStats.rebounds / Math.max(1, right.seasonStats.gamesPlayed) },
    { label: 'APG', left: left.seasonStats.assists / Math.max(1, left.seasonStats.gamesPlayed), right: right.seasonStats.assists / Math.max(1, right.seasonStats.gamesPlayed) },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-display tracking-wide">Key Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
          {stats.map((s) => (
            <div key={s.label} className="contents">
              <div className="text-right font-mono">{s.left.toFixed(1)}</div>
              <div className="w-20 text-center text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">{s.label}</div>
              <div className="font-mono">{s.right.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CompareView({
  left,
  right,
  leftTeam,
  rightTeam,
}: {
  left: Player
  right: Player
  leftTeam?: StaticTeam | null
  rightTeam?: StaticTeam | null
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <PlayerSide player={left} team={leftTeam} label="Player A" />
        <PlayerSide player={right} team={rightTeam} label="Player B" />
      </div>

      <SideBySideStats left={left} right={right} />

      <SideBySideRatings left={left.ratings} right={right.ratings} />

      <div className="flex justify-center gap-4">
        <Link
          to={`/player/${left.id}`}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line-soft)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)] transition-colors"
        >
          Open {left.firstName} {left.lastName}
        </Link>
        <Link
          to={`/player/${right.id}`}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line-soft)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)] transition-colors"
        >
          Open {right.firstName} {right.lastName}
        </Link>
      </div>
    </div>
  )
}
