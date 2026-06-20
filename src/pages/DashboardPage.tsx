import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Play, Calendar, FastForward } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { FaceIndicator } from '@/components/shared/FaceIndicator'
import { Chip } from '@/components/shared/Chip'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { SimSpeedToggle } from '@/components/sim/SimSpeedToggle'
import { Button } from '@/components/ui/button'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function DashboardSimControls() {
  const navigate = useNavigate()
  const simNextGame = useGameStore((s) => s.simNextGame)
  const simDay = useGameStore((s) => s.simDay)
  const simWeek = useGameStore((s) => s.simWeek)
  const getNext = useGameStore((s) => s.getNextScheduledGameForUser)
  const ensureSchedule = useGameStore((s) => s.ensureSchedule)
  const hasNext = Boolean(getNext() ?? ensureSchedule(1))

  const handleSimNext = async () => {
    const result = await simNextGame()
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    void navigate(`/game/${result.gameId}`)
  }
  const handleSimDay = async () => {
    const r = await simDay()
    toast.success(`Simulated ${r.gamesSimulated} game${r.gamesSimulated === 1 ? '' : 's'}.`)
  }
  const handleSimWeek = async () => {
    const r = await simWeek()
    toast.success(`Simulated ${r.gamesSimulated} game${r.gamesSimulated === 1 ? '' : 's'}.`)
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Sim controls
            </div>
            <div className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Play the next matchup or batch through a day or week.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleSimNext}
              disabled={!hasNext}
              title={hasNext ? 'Sim the next game' : 'No upcoming games'}
            >
              <Play className="mr-1 size-3.5" /> Sim next game
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSimDay}
              disabled={!hasNext}
            >
              <Calendar className="mr-1 size-3.5" /> Sim day
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSimWeek}
              disabled={!hasNext}
            >
              <FastForward className="mr-1 size-3.5" /> Sim week
            </Button>
            <SimSpeedToggle />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const save = useGameStore((s) => s.save)

  if (!save) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Front Office"
          title="Dashboard"
          description="Start a new league to see your team's dashboard."
        />
        <Card>
          <CardContent className="p-8 text-center">
            <div className="font-display text-2xl">No active save</div>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">
              Start a new league or load an existing save to view the dashboard.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link
                to="/new-league"
                className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 h-9 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
              >
                New League
              </Link>
              <Link
                to="/load-game"
                className="inline-flex items-center justify-center rounded-md border border-[var(--color-line-soft)] px-4 h-9 text-sm font-medium hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Load Game
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { league, metadata } = save
  const userTeam = league.teams[league.userTeamId]
  const standing = league.standings[league.userTeamId]

  const rosterPlayers = userTeam
    ? userTeam.roster
        .map((id) => league.players[id])
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : []

  const topByOverall = [...rosterPlayers]
    .sort((a, b) => (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0))
    .slice(0, 3)

  const injuredPlayers = rosterPlayers.filter(
    (p) => p.health.status !== 'healthy',
  )

  const unhappyPlayers = rosterPlayers.filter(
    (p) => p.morale.happiness < 50,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front Office"
        title="Dashboard"
        description={`${metadata.name} — ${league.currentDate}`}
      />

      <DashboardSimControls />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Record
            </div>
            <div className="font-display text-3xl mt-2">
              {standing ? `${standing.wins} - ${standing.losses}` : '0 - 0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Conference
            </div>
            <div className="font-display text-3xl mt-2">
              {userTeam?.conference ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Phase
            </div>
            <div className="font-display text-3xl mt-2 capitalize">
              {league.phase.replace('_', ' ')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Season
            </div>
            <div className="font-display text-3xl mt-2">
              {metadata.snapshotId}
            </div>
          </CardContent>
        </Card>
      </div>

      {userTeam && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  Cap Health
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <div className="font-display text-2xl">
                    {fmt(userTeam.finances.payroll)}
                  </div>
                  <div className="text-sm text-[var(--color-muted-foreground)]">
                    / {fmt(league.rules.salaryCap)} cap
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--color-muted-foreground)]">
                  <span>
                    Cap space:{' '}
                    <span
                      className={
                        userTeam.finances.capSpace < 0
                          ? 'text-red-500 font-medium'
                          : 'text-emerald-500 font-medium'
                      }
                    >
                      {fmt(userTeam.finances.capSpace)}
                    </span>
                  </span>
                  <span>
                    Tax bill: <span className="font-medium">{fmt(userTeam.finances.taxBill)}</span>
                  </span>
                </div>
              </div>
              <Link
                to="/contracts"
                className="rounded-md border border-[var(--color-line-soft)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Go to contracts
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {userTeam && userTeam.lineup.starters.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                Starting Lineup
              </div>
              <div className="flex items-center gap-2">
                {userTeam.lineup.lastValidationWarnings &&
                  userTeam.lineup.lastValidationWarnings.length > 0 && (
                    <Link
                      to="/lineup"
                      className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-500 hover:bg-amber-500/20 transition-colors"
                    >
                      <AlertTriangle className="size-3" />
                      {userTeam.lineup.lastValidationWarnings.length} warning(s)
                    </Link>
                  )}
                <Link
                  to="/lineup"
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  Edit
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {userTeam.lineup.starters.map((pid) => {
                const player = league.players[pid]
                if (!player) return null
                return (
                  <Link
                    key={pid}
                    to={`/player/${pid}`}
                    className="flex items-center gap-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2.5 py-1.5 hover:bg-[var(--color-surface-3)] transition-colors"
                  >
                    <PlayerHeadshot player={player} size={24} />
                    <span className="text-sm font-medium">
                      {player.firstName} {player.lastName}
                    </span>
                    <Chip label={player.position} size="sm" />
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
              Roster Summary
            </div>
            {topByOverall.length === 0 ? (
              <div className="text-sm text-[var(--color-muted-foreground)]">No roster data</div>
            ) : (
              <div className="space-y-3">
                {topByOverall.map((p) => {
                  const team = p.teamId ? league.teams[p.teamId] : null
                  return (
                    <Link
                      key={p.id}
                      to={`/player/${p.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <PlayerHeadshot player={p} team={team} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium group-hover:text-[var(--color-primary)] transition-colors truncate">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-[10px] text-[var(--color-muted-foreground)]">
                          {p.position} · {p.ratings.overall} OVR
                        </div>
                      </div>
                      <div className="text-xs font-mono text-[var(--color-muted-foreground)]">
                        {fmt(p.contract.salaryByYear[0] ?? 0)}
                      </div>
                    </Link>
                  )
                })}
                <Link
                  to="/roster"
                  className="block text-center text-xs text-[var(--color-primary)] hover:underline mt-2"
                >
                  View full roster
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
              Injury Report
            </div>
            {injuredPlayers.length === 0 ? (
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <div className="text-emerald-500 font-medium">All healthy</div>
                <div className="mt-1">No injuries to report</div>
              </div>
            ) : (
              <div className="space-y-2">
                {injuredPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Chip
                      label={p.health.status === 'day_to_day' ? 'DTD' : 'Out'}
                      variant="danger"
                    />
                    <span className="text-sm">{p.firstName} {p.lastName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
              Morale Alerts
            </div>
            {unhappyPlayers.length === 0 ? (
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <div className="text-emerald-500 font-medium">Team morale good</div>
                <div className="mt-1">No unhappy players</div>
              </div>
            ) : (
              <div className="space-y-2">
                {unhappyPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <FaceIndicator value={p.morale.happiness} />
                    <span className="text-sm">{p.firstName} {p.lastName}</span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      ({p.morale.happiness}/100)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
