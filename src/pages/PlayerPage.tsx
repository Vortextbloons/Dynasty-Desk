import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy, TrendingUp, BarChart3, DollarSign, Activity, FlaskConical, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePlayerById } from '@/hooks/usePlayerById'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import { useGameStore } from '@/store/useGameStore'
import { PlayerBioCard } from '@/components/player/PlayerBioCard'
import { PlayerRatingsRadar } from '@/components/player/PlayerRatingsRadar'
import { RatingsTable } from '@/components/player/RatingsTable'
import { TendenciesList } from '@/components/player/TendenciesList'
import { ContractDetail } from '@/components/player/ContractDetail'
import { StatsTable } from '@/components/player/StatsTable'
import { DevelopmentChart } from '@/components/player/DevelopmentChart'
import { TradeValueCard } from '@/components/player/TradeValueCard'
import { FaceIndicator } from '@/components/shared/FaceIndicator'
import { Chip } from '@/components/shared/Chip'
import { type PlayerSeasonStats } from '@/game/models/playerSeasonStats'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'ratings' | 'tendencies' | 'contract' | 'stats' | 'development' | 'tradeValue'

const TABS: {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'overview', label: 'Overview', icon: Star },
  { id: 'ratings', label: 'Ratings', icon: Trophy },
  { id: 'tendencies', label: 'Tendencies', icon: BarChart3 },
  { id: 'contract', label: 'Contract', icon: DollarSign },
  { id: 'stats', label: 'Stats', icon: TrendingUp },
  { id: 'development', label: 'Development', icon: FlaskConical },
  { id: 'tradeValue', label: 'Trade Value', icon: Activity },
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
  const [tab, setTab] = useState<Tab>('overview')

  const player = usePlayerById(id)

  const team = useMemo(() => {
    if (!player?.teamId) return null
    if (save) {
      return save.league.teams[player.teamId] ?? null
    }
    if (snapshot) {
      return snapshot.teams.find((t) => t.id === player.teamId) ?? null
    }
    return null
  }, [save, snapshot, player])

  const historicalSeasons = useMemo<PlayerSeasonStats[]>(() => {
    if (!player) return []
    if (save) {
      return Object.values(save.league.players)
        .flatMap((p) => p.historicalSeasons)
        .filter((s) => s.playerId === player.id)
    }
    if (snapshot) {
      return snapshot.seasonStats.filter((s) => s.playerId === player.id)
    }
    return []
  }, [save, snapshot, player])

  if (!player) {
    return (
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
    )
  }

  const healthStatus = player.health.status
  const healthLabel = healthStatus === 'healthy' ? 'Healthy'
    : healthStatus === 'day_to_day' ? 'DTD'
    : healthStatus === 'short_term' ? 'Out (Short)'
    : healthStatus === 'long_term' ? 'Out (Long)'
    : 'Season Ending'

  return (
    <div>
      <PageHeader
        eyebrow="Player"
        title={`${player.firstName} ${player.lastName}`}
        description={`${team ? team.city : ''} ${team ? team.name : 'Free Agent'} · #${player.position} · Age ${player.age}`}
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
        <Stat label="OVR" value={String(player.ratings.overall)} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Chip label={healthLabel} variant={healthStatus === 'healthy' ? 'success' : 'danger'} />
        {player.contract.noTradeClause && <Chip label="NTC" variant="info" />}
        {player.contract.option !== 'none' && (
          <Chip
            label={player.contract.option === 'team' ? 'Team Option' : 'Player Option'}
            variant="warning"
          />
        )}
        <FaceIndicator value={player.morale.happiness} showLabel />
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--color-line-soft)] mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap',
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

      {tab === 'overview' && (
        <div className="space-y-6">
          <PlayerBioCard player={player} team={team} />
          <div className="grid gap-6 lg:grid-cols-2">
            <PlayerRatingsRadar ratings={player.ratings} position={player.position} />
            <Card>
              <CardContent className="p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
                  Quick Stats
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="PPG" value={(player.seasonStats.points / Math.max(1, player.seasonStats.gamesPlayed)).toFixed(1)} />
                  <MiniStat label="RPG" value={(player.seasonStats.rebounds / Math.max(1, player.seasonStats.gamesPlayed)).toFixed(1)} />
                  <MiniStat label="APG" value={(player.seasonStats.assists / Math.max(1, player.seasonStats.gamesPlayed)).toFixed(1)} />
                  <MiniStat label="SPG" value={(player.seasonStats.steals / Math.max(1, player.seasonStats.gamesPlayed)).toFixed(1)} />
                  <MiniStat label="BPG" value={(player.seasonStats.blocks / Math.max(1, player.seasonStats.gamesPlayed)).toFixed(1)} />
                  <MiniStat label="GP" value={String(player.seasonStats.gamesPlayed)} />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-2">
                Contract
              </div>
              <div className="text-sm">
                {player.contract.yearsRemaining} yr · ${((player.contract.salaryByYear[0] ?? 0) / 1_000_000).toFixed(1)}M/yr
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'ratings' && <RatingsTable ratings={player.ratings} />}
      {tab === 'tendencies' && <TendenciesList tendencies={player.tendencies} />}
      {tab === 'contract' && <ContractDetail contract={player.contract} />}
      {tab === 'stats' && (
        <StatsTable historicalSeasons={historicalSeasons} />
      )}
      {tab === 'development' && <DevelopmentChart player={player} />}
      {tab === 'tradeValue' && <TradeValueCard player={player} />}
    </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">{label}</div>
      <div className="font-display text-lg">{value}</div>
    </div>
  )
}
