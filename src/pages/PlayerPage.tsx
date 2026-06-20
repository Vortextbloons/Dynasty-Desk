import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy, TrendingUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppShell } from '@/components/layout/AppShell'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import { useGameStore } from '@/store/useGameStore'
import {
  computeCareerStats,
  type PlayerCareerStats,
} from '@/game/models/playerCareerStats'
import {
  perGame,
  type PlayerSeasonStats,
} from '@/game/models/playerSeasonStats'
import { AWARD_SHORT_LABELS, type AwardWinner } from '@/game/models/award'
import { cn } from '@/lib/utils'

type Tab = 'ratings' | 'career' | 'awards' | 'bio'

const TABS: {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'career', label: 'Career', icon: TrendingUp },
  { id: 'ratings', label: 'Ratings', icon: Trophy },
  { id: 'awards', label: 'Awards', icon: Trophy },
  { id: 'bio', label: 'Bio', icon: Calendar },
]

export function PlayerPage() {
  const { id = '' } = useParams<{ id: string }>()
  const save = useGameStore((s) => s.save)
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    defaultSeasonId,
  )
  const [tab, setTab] = useState<Tab>('career')

  const allPlayers = save
    ? Object.values(save.league.players)
    : snapshot?.players ?? []
  const allTeams = save
    ? Object.values(save.league.teams)
    : snapshot?.teams ?? []
  const allAwards = save
    ? save.league.awards
    : snapshot?.awards ?? []
  const allSeasonStats = save
    ? Object.values(save.league.players).flatMap((p) => p.historicalSeasons)
    : snapshot?.seasonStats ?? []

  const player = useMemo(
    () => allPlayers.find((p) => p.id === id),
    [allPlayers, id],
  )
  const team = useMemo(
    () =>
      player?.teamId
        ? allTeams.find((t) => t.id === player.teamId)
        : null,
    [allTeams, player],
  )

  const historicalSeasons = useMemo<PlayerSeasonStats[]>(() => {
    return allSeasonStats.filter((s) => s.playerId === player?.id)
  }, [allSeasonStats, player])

  const career = useMemo<PlayerCareerStats | null>(() => {
    if (!player) return null
    return computeCareerStats(player.id, historicalSeasons)
  }, [player, historicalSeasons])

  const awards = useMemo<AwardWinner[]>(() => {
    return allAwards.filter((a) => a.playerId === player?.id)
  }, [allAwards, player])

  if (!player) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Players"
          title="Player not found"
          description="The snapshot might still be loading, or this player isn't in the current dataset."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/roster">
                <ArrowLeft className="size-4" /> Roster
              </Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Player"
        title={`${player.firstName} ${player.lastName}`}
        description={`${team?.city ?? ''} ${team?.name ?? 'Free Agent'} · #${player.position} · Age ${player.age}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/roster">
              <ArrowLeft className="size-4" /> Roster
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Position" value={player.position} />
        <Stat
          label="Height"
          value={`${Math.floor(player.heightInches / 12)}'${player.heightInches % 12}"`}
        />
        <Stat label="Weight" value={`${player.weightLbs} lbs`} />
        <Stat label="OVR" value={String(overall(player))} />
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--color-line-soft)] mb-6">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'career' ? <CareerTab career={career} /> : null}
      {tab === 'ratings' ? <RatingsTab player={player} /> : null}
      {tab === 'awards' ? <AwardsTab awards={awards} /> : null}
      {tab === 'bio' ? <BioTab player={player} /> : null}
    </AppShell>
  )
}

function CareerTab({ career }: { career: PlayerCareerStats | null }) {
  if (!career) {
    return (
      <EmptyCard body="No season stats available for this player in the current snapshot." />
    )
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Career averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <Stat label="PPG" value={career.averages.ppg.toFixed(1)} />
            <Stat label="RPG" value={career.averages.rpg.toFixed(1)} />
            <Stat label="APG" value={career.averages.apg.toFixed(1)} />
            <Stat label="SPG" value={career.averages.spg.toFixed(1)} />
            <Stat label="BPG" value={career.averages.bpg.toFixed(1)} />
            <Stat label="MPG" value={career.averages.mpg.toFixed(1)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Season by season</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] border-b border-[var(--color-line-soft)]">
                  <th className="text-left px-5 py-2 font-medium">Season</th>
                  <th className="text-right px-3 py-2 font-medium">GP</th>
                  <th className="text-right px-3 py-2 font-medium">MPG</th>
                  <th className="text-right px-3 py-2 font-medium">PPG</th>
                  <th className="text-right px-3 py-2 font-medium">RPG</th>
                  <th className="text-right px-3 py-2 font-medium">APG</th>
                  <th className="text-right px-3 py-2 font-medium">SPG</th>
                  <th className="text-right px-3 py-2 font-medium">BPG</th>
                  <th className="text-right px-3 py-2 font-medium">TS%</th>
                </tr>
              </thead>
              <tbody>
                {career.seasons.map((s) => {
                  const pg = perGame(s)
                  return (
                    <tr
                      key={s.season}
                      className="border-b border-[var(--color-line-soft)] last:border-b-0"
                    >
                      <td className="px-5 py-2 font-mono">
                        <span className="inline-flex items-center gap-1.5">
                          {s.season}
                          <span className="text-[9px] uppercase tracking-[0.2em] rounded-sm bg-[var(--color-surface-3)] text-[var(--color-muted-foreground)] px-1.5 py-0.5">
                            NBA
                          </span>
                        </span>
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {s.gamesPlayed}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {pg.mpg.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {pg.ppg.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {pg.rpg.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {pg.apg.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {pg.spg.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {pg.bpg.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {(s.tsPct * 100).toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type RatingKey = keyof import('@/game/models/ratings').PlayerRatings

function RatingsTab({
  player,
}: {
  player: { ratings: import('@/game/models/ratings').PlayerRatings }
}) {
  const groups: { label: string; keys: { key: RatingKey; label: string }[] }[] =
    [
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
        label: 'Rebounding',
        keys: [
          { key: 'offensiveRebound', label: 'OREB' },
          { key: 'defensiveRebound', label: 'DREB' },
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
          { key: 'stamina', label: 'Stam' },
          { key: 'durability', label: 'Dur' },
        ],
      },
      {
        label: 'Mental',
        keys: [
          { key: 'clutch', label: 'Clutch' },
          { key: 'consistency', label: 'Cons' },
          { key: 'potential', label: 'Pot' },
        ],
      },
    ]
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <Card key={g.label}>
          <CardHeader>
            <CardTitle className="text-sm font-display tracking-wide">
              {g.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.keys.map((k) => {
              const value = player.ratings[k.key]
              return (
                <div key={k.key} className="flex items-center gap-3">
                  <div className="w-14 text-xs text-[var(--color-muted-foreground)]">
                    {k.label}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)]"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="w-8 text-right font-mono text-sm">
                    {value}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AwardsTab({ awards }: { awards: AwardWinner[] }) {
  if (awards.length === 0) {
    return (
      <EmptyCard body="No awards recorded in the current snapshot for this player." />
    )
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-[var(--color-line-soft)]">
          {awards.map((a, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] grid place-items-center font-display text-xs">
                  {AWARD_SHORT_LABELS[a.award]}
                </div>
                <div>
                  <div className="font-display text-sm">
                    {AWARD_SHORT_LABELS[a.award]}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {a.season}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function BioTab({
  player,
}: {
  player: {
    heightInches: number
    weightLbs: number
    age: number
    position: string
    secondaryPositions: string[]
    contract: {
      salaryByYear: number[]
      yearsRemaining: number
      noTradeClause: boolean
    }
  }
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Position" value={player.position} />
          <Stat
            label="Height"
            value={`${Math.floor(player.heightInches / 12)}'${player.heightInches % 12}"`}
          />
          <Stat label="Weight" value={`${player.weightLbs} lbs`} />
          <Stat label="Age" value={String(player.age)} />
          <Stat
            label="Secondary"
            value={player.secondaryPositions.join(', ') || '—'}
          />
          <Stat
            label="NTC"
            value={player.contract.noTradeClause ? 'Yes' : 'No'}
          />
        </div>
        <div className="border-t border-[var(--color-line-soft)] pt-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-2">
            Contract
          </div>
          <div className="text-sm">
            {player.contract.yearsRemaining} yr · $
            {(player.contract.salaryByYear[0] ?? 0).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {label}
      </div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  )
}

function EmptyCard({ body }: { body: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        {body}
      </CardContent>
    </Card>
  )
}

function overall(p: {
  ratings: {
    insideScoring: number
    threePoint: number
    passing: number
    defensiveIq: number
    speed: number
    offensiveRebound: number
    defensiveRebound: number
    perimeterDefense: number
    interiorDefense: number
    potential: number
  }
}): number {
  const r = p.ratings
  return Math.round(
    (r.insideScoring * 0.18 +
      r.threePoint * 0.12 +
      r.passing * 0.12 +
      r.defensiveIq * 0.12 +
      r.speed * 0.06 +
      (r.offensiveRebound + r.defensiveRebound) * 0.05 +
      (r.perimeterDefense + r.interiorDefense) * 0.1 +
      r.potential * 0.05) /
      0.8,
  )
}
