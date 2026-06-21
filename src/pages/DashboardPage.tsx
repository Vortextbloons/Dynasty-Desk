import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Play, Calendar, FastForward, ChevronRight, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { TeamLogo } from '@/components/team/TeamLogo'
import { Chip } from '@/components/shared/Chip'
import { SimSpeedToggle } from '@/components/sim/SimSpeedToggle'
import { Button } from '@/components/ui/button'
import { PhaseTimeline } from '@/components/offseason/PhaseTimeline'
import { InjuryReportCard } from '@/components/health/InjuryReportCard'
import { MoraleAlertsCard } from '@/components/morale/MoraleCard'
import { NewsTicker } from '@/components/news/NewsTicker'
import { TeamStatTrendChart } from '@/components/charts/TeamStatTrendChart'
import { StreakCard } from '@/components/dashboard/StreakCard'
import { recomputeStandings, computeGB } from '@/game/league/standingsEngine'
import { computeTeamStreak } from '@/game/league/teamStreak'
import { getSeriesRoundLabel } from '@/game/models/playoff'
import type { LeagueState } from '@/game/models/league'
import { canAdvancePhase } from '@/game/league/offseasonEngine'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function OffseasonDashboardCard({ league }: { league: LeagueState }) {
  const advancePhase = useGameStore((s) => s.advancePhase)
  const navigate = useNavigate()
  const [advancing, setAdvancing] = useState(false)
  const advanceGuard = canAdvancePhase(league)

  const handleAdvance = async () => {
    setAdvancing(true)
    try {
      const result = await advancePhase()
      if (result?.blocked) {
        toast.error(result.reason ?? 'Cannot advance phase.')
        return
      }
      if (result?.newPhase === 'regular_season') {
        toast.success('New season started!')
        void navigate('/dashboard')
      } else if (result?.newPhase === 'draft') {
        toast.success('Advanced to draft')
        void navigate('/draft')
      } else if (result?.newPhase) {
        toast.success(`Advanced to ${result.newPhase.replace(/_/g, ' ')}`)
      }
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <Card className="border-[var(--color-primary)]/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Offseason · {league.phase.replace(/_/g, ' ')}
            </div>
            <div className="mt-1 text-sm">
              Roster cap: {league.rosterSizeCap} · Continue the dynasty loop.
            </div>
          </div>
          <Trophy className="size-5 text-[var(--color-primary)]" />
        </div>
        <PhaseTimeline
          currentPhase={league.phase}
          onAdvance={handleAdvance}
          advancing={advancing}
          canAdvance={advanceGuard.ok}
          blockReason={advanceGuard.ok ? undefined : advanceGuard.reason}
        />
        <Link
          to="/offseason"
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          Offseason hub →
        </Link>
      </CardContent>
    </Card>
  )
}

function DashboardSimControls() {
  const navigate = useNavigate()
  const simNextGame = useGameStore((s) => s.simNextGame)
  const simDay = useGameStore((s) => s.simDay)
  const simWeek = useGameStore((s) => s.simWeek)
  const simUntilUserGame = useGameStore((s) => s.simUntilUserGame)
  const save = useGameStore((s) => s.save)
  const hasSchedule = save?.league.scheduleGenerated ?? false

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
    if (r.gamesSimulated === 0) {
      toast.info('No games to simulate today.')
    } else {
      toast.success(`Simulated ${r.gamesSimulated} game${r.gamesSimulated === 1 ? '' : 's'}.`)
    }
  }
  const handleSimWeek = async () => {
    const r = await simWeek()
    if (r.gamesSimulated === 0) {
      toast.info('No games to simulate this week.')
    } else {
      toast.success(`Simulated ${r.gamesSimulated} game${r.gamesSimulated === 1 ? '' : 's'}.`)
    }
  }
  const handleSimToMyGame = async () => {
    const r = await simUntilUserGame()
    if (r.gamesSimulated === 0) {
      toast.info('No games to simulate before your next game.')
    } else {
      toast.success(`Simulated ${r.gamesSimulated} game${r.gamesSimulated === 1 ? '' : 's'}.`)
    }
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
            <Button size="sm" onClick={handleSimNext} disabled={!hasSchedule}>
              <Play className="mr-1 size-3.5" /> Sim next game
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSimDay} disabled={!hasSchedule}>
              <Calendar className="mr-1 size-3.5" /> Sim day
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSimWeek} disabled={!hasSchedule}>
              <FastForward className="mr-1 size-3.5" /> Sim week
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSimToMyGame} disabled={!hasSchedule}>
              <Play className="mr-1 size-3.5" /> Sim to my game
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
  const simSeason = useGameStore((s) => s.simSeason)
  const simRunning = useGameStore((s) => s.simRunning)
  const simProgress = useGameStore((s) => s.simProgress)
  const cancelSimulation = useGameStore((s) => s.cancelSimulation)
  const navigate = useNavigate()

  const league = save?.league
  const metadata = save?.metadata
  const userTeam = league ? league.teams[league.userTeamId] : undefined

  const standings = useMemo(() => {
    if (!league) return {}
    return recomputeStandings(
      league.games,
      league.teams,
      league.rules.seasonLabel,
      league.rules.regularSeasonGames,
    )
  }, [league])

  const standing = league ? (standings[league.userTeamId] ?? null) : null

  const nextUserGame = useMemo(() => {
    if (!league) return null
    const teamId = league.userTeamId
    const today = league.currentDate
    const games = Object.values(league.games)
      .filter(
        (g): g is NonNullable<typeof g> =>
          g?.status === 'scheduled' &&
          (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
          g.date >= today,
      )
      .sort((a, b) => a.date.localeCompare(b.date))
    return games[0] ?? null
  }, [league])

  const lastUserGame = useMemo(() => {
    if (!league) return null
    const teamId = league.userTeamId
    const games = Object.values(league.games)
      .filter(
        (g): g is NonNullable<typeof g> =>
          g?.status === 'final' &&
          (g.homeTeamId === teamId || g.awayTeamId === teamId),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
    return games[0] ?? null
  }, [league])

  const conferenceLeader = useMemo(() => {
    if (!league || !userTeam) return null
    const conf = userTeam.conference
    const confTeams = Object.values(standings)
      .filter((s) => {
        const team = league.teams[s.teamId]
        return team?.conference === conf
      })
      .sort((a, b) => a.conferenceRank - b.conferenceRank)
    return confTeams[0] ?? null
  }, [standings, league, userTeam])

  if (!save || !league || !metadata) {
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

  const rosterPlayers = userTeam
    ? userTeam.roster
        .map((id) => league.players[id])
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : []

  const topByOverall = [...rosterPlayers]
    .sort((a, b) => (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0))
    .slice(0, 3)

  const teamStreak = userTeam
    ? computeTeamStreak(league.games, userTeam.id)
    : { wins: 0, losses: 0 }

  const recentNews = [...league.news].reverse()

  const handleSimSeason = async () => {
    if (!league.scheduleGenerated) {
      toast.error('Generate a schedule first.')
      return
    }
    if (save.settings.simSpeed === 'normal') {
      toast.info('Tip: Switch to instant speed for faster bulk sim.', { duration: 5000 })
    }
    const result = await simSeason()
    if (result.cancelled) {
      toast.info(`Sim cancelled. ${result.gamesSimulated} games simulated.`)
    } else if (result.phaseTransitioned) {
      const label = result.nextPhase === 'play_in' ? 'Play-In' : 'Playoffs'
      toast.success(`Regular season complete! ${result.gamesSimulated} games simulated. Moving to ${label}.`)
      void navigate('/playoffs')
    } else if (result.gamesSimulated > 0) {
      toast.success(`Season sim complete. ${result.gamesSimulated} games simulated.`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front Office"
        title="Dashboard"
        description={`${metadata.name} — ${league.currentDate}`}
      />

      <DashboardSimControls />

      {simRunning && simProgress && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-[10px] text-[var(--color-muted-foreground)]">
              <span>Simulating {simProgress.current} of {simProgress.total} games</span>
              <span>{simProgress.percentage}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-200"
                style={{ width: `${simProgress.percentage}%` }}
              />
            </div>
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="ghost" onClick={cancelSimulation}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Record
            </div>
            <div className="font-display text-3xl mt-2">
              {standing ? `${standing.wins} - ${standing.losses}` : '0 - 0'}
            </div>
            {standing && (
              <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                <span>{standing.winPct.toFixed(3)}</span>
                <span>·</span>
                <span>#{standing.conferenceRank} {userTeam?.conference}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {nextUserGame && (
          <Card>
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                Next Game
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const opponentId = nextUserGame.homeTeamId === league.userTeamId ? nextUserGame.awayTeamId : nextUserGame.homeTeamId
                    const opponent = league.teams[opponentId]
                    return opponent ? <TeamLogo team={opponent} size={24} /> : null
                  })()}
                  <span className="text-sm font-medium">
                    {nextUserGame.homeTeamId === league.userTeamId ? 'vs' : '@'}{' '}
                    {league.teams[nextUserGame.homeTeamId === league.userTeamId ? nextUserGame.awayTeamId : nextUserGame.homeTeamId]?.abbreviation ?? '???'}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--color-muted-foreground)]">
                  {nextUserGame.date}
                </div>
              </div>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  void (async () => {
                    const result = await useGameStore.getState().simOneGame(nextUserGame.id)
                    if ('error' in result) {
                      toast.error(result.error)
                      return
                    }
                    void navigate(`/game/${result.gameId}`)
                  })()
                }}
              >
                <Play className="mr-1 size-3" /> Sim
              </Button>
            </CardContent>
          </Card>
        )}

        {standing && conferenceLeader && (
          <Card>
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                Playoff Picture
              </div>
              <div className="mt-2">
                <div className="text-sm">
                  <span className="font-medium">#{standing.conferenceRank}</span>
                  <span className="ml-1 text-[var(--color-muted-foreground)]">{userTeam?.conference}</span>
                </div>
                <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  GB: {computeGB(conferenceLeader.wins, conferenceLeader.losses, standing.wins, standing.losses)}
                </div>
                {standing.clinchedPlayoff && (
                  <div className="mt-1 text-[10px] text-emerald-500 font-medium">Clinched Playoff</div>
                )}
                {standing.eliminated && (
                  <div className="mt-1 text-[10px] text-red-500 font-medium">Eliminated</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <StreakCard streak={teamStreak} />

        {lastUserGame && (
          <Card>
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                Last Game
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const opponentId = lastUserGame.homeTeamId === league.userTeamId ? lastUserGame.awayTeamId : lastUserGame.homeTeamId
                    const opponent = league.teams[opponentId]
                    return opponent ? <TeamLogo team={opponent} size={24} /> : null
                  })()}
                  <span className="text-sm font-medium">
                    {lastUserGame.homeTeamId === league.userTeamId ? 'vs' : '@'}{' '}
                    {league.teams[lastUserGame.homeTeamId === league.userTeamId ? lastUserGame.awayTeamId : lastUserGame.homeTeamId]?.abbreviation ?? '???'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono">
                    {lastUserGame.homeScore} – {lastUserGame.awayScore}
                  </span>
                  {(() => {
                    const isHome = lastUserGame.homeTeamId === league.userTeamId
                    const won = isHome
                      ? (lastUserGame.homeScore ?? 0) > (lastUserGame.awayScore ?? 0)
                      : (lastUserGame.awayScore ?? 0) > (lastUserGame.homeScore ?? 0)
                    return (
                      <span className={`text-[10px] font-bold ${won ? 'text-emerald-500' : 'text-red-500'}`}>
                        {won ? 'W' : 'L'}
                      </span>
                    )
                  })()}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => void navigate(`/game/${lastUserGame.id}`)}
              >
                Box score <ChevronRight className="ml-1 size-3" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {(league.phase === 'play_in' || league.phase === 'playoffs') && league.playoffBracket && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/playoffs">
            <Card className="hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                      Playoff Bracket
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {league.playoffBracket.status === 'play_in'
                        ? 'Play-In Tournament'
                        : league.playoffBracket.status === 'complete'
                          ? 'Playoffs Complete'
                          : 'In Progress'}
                    </div>
                  </div>
                  <Trophy className="size-5 text-[var(--color-primary)]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {league.playoffBracket.status === 'bracket' && (() => {
            const userSeries = [...(league.playoffBracket.east ?? []), ...(league.playoffBracket.west ?? []), ...(league.playoffBracket.finals ? [league.playoffBracket.finals] : [])]
              .find((s) =>
                s.higherSeedTeamId === league.userTeamId ||
                s.lowerSeedTeamId === league.userTeamId
              )
            if (!userSeries) return null
            const opponentId = userSeries.higherSeedTeamId === league.userTeamId
              ? userSeries.lowerSeedTeamId
              : userSeries.higherSeedTeamId
            const opponent = league.teams[opponentId]
            return (
              <Card>
                <CardContent className="p-5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                    Your Series
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    vs {opponent?.abbreviation ?? '???'}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {getSeriesRoundLabel(userSeries.round)} — {userSeries.higherSeedWins}-{userSeries.lowerSeedWins}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {league.playoffBracket.status === 'complete' && league.playoffBracket.championTeamId && (
            <Card className="border-[var(--color-primary)]/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Trophy className="size-6 text-[var(--color-primary)]" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary)]">
                      Champion
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {league.teams[league.playoffBracket.championTeamId]?.city}{' '}
                      {league.teams[league.playoffBracket.championTeamId]?.name}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(league.phase === 'offseason' ||
        league.phase === 'draft' ||
        league.phase === 'free_agency' ||
        league.phase === 'preseason') && (
        <OffseasonDashboardCard league={league} />
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                Cap Health
              </div>
              {userTeam && (
                <div className="flex items-baseline gap-3 mt-1">
                  <div className="font-display text-2xl">
                    {fmt(userTeam.finances.payroll)}
                  </div>
                  <div className="text-sm text-[var(--color-muted-foreground)]">
                    / {fmt(league.rules.salaryCap)} cap
                  </div>
                </div>
              )}
              {userTeam && (
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
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSimSeason}
                disabled={simRunning}
              >
                <FastForward className="mr-1 size-3.5" />
                {simRunning ? `Simming ${simProgress?.percentage ?? 0}%` : 'Sim Season'}
              </Button>
              <Link
                to="/contracts"
                className="rounded-md border border-[var(--color-line-soft)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Go to contracts
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {userTeam && (
        <TeamStatTrendChart seasonResults={[]} teamName={userTeam.name} />
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

        <InjuryReportCard players={rosterPlayers} />
        <MoraleAlertsCard players={rosterPlayers} />
      </div>

      <NewsTicker news={recentNews} />
    </div>
  )
}
