import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { recomputeStandings, computeGB, formatLast10 } from '@/game/league/standingsEngine'
import { TeamDirectionBadge } from '@/components/team/TeamDirectionBadge'
import { TeamLogo } from '@/components/team/TeamLogo'
import { formatWinPct } from '@/lib/format'
import { FastForward, Trophy } from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'East' | 'West' | 'League'

export function StandingsPage() {
  const save = useGameStore((s) => s.save)
  const simSeason = useGameStore((s) => s.simSeason)
  const simRunning = useGameStore((s) => s.simRunning)
  const simProgress = useGameStore((s) => s.simProgress)
  const cancelSimulation = useGameStore((s) => s.cancelSimulation)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('East')

  const standings = useMemo(() => {
    if (!save) return []
    const recomputed = recomputeStandings(
      save.league.games,
      save.league.teams,
      save.league.rules.seasonLabel,
      save.league.rules.regularSeasonGames,
    )
    return Object.values(recomputed)
  }, [save])

  const eastStandings = useMemo(() => {
    if (!save) return []
    return standings
      .filter((s) => {
        const team = save.league.teams[s.teamId]
        return team?.conference === 'East'
      })
      .sort((a, b) => a.conferenceRank - b.conferenceRank)
  }, [standings, save])

  const westStandings = useMemo(() => {
    if (!save) return []
    return standings
      .filter((s) => {
        const team = save.league.teams[s.teamId]
        return team?.conference === 'West'
      })
      .sort((a, b) => a.conferenceRank - b.conferenceRank)
  }, [standings, save])

  const leagueStandings = useMemo(() => {
    return [...standings].sort((a, b) => b.winPct - a.winPct || a.losses - b.losses)
  }, [standings])

  const userStanding = useMemo(() => {
    if (!save) return null
    return standings.find((s) => s.teamId === save.league.userTeamId) ?? null
  }, [standings, save])

  const leaderWins = useMemo(() => {
    if (!save) return 0
    const activeConf = activeTab === 'League' ? null : activeTab
    const confStandings = activeTab === 'League'
      ? leagueStandings
      : standings.filter((s) => {
          const team = save.league.teams[s.teamId]
          return team?.conference === activeConf
        }).sort((a, b) => a.conferenceRank - b.conferenceRank)
    return confStandings[0]?.wins ?? 0
  }, [standings, leagueStandings, activeTab, save])

  const leaderLosses = useMemo(() => {
    if (!save) return 0
    const activeConf = activeTab === 'League' ? null : activeTab
    const confStandings = activeTab === 'League'
      ? leagueStandings
      : standings.filter((s) => {
          const team = save.league.teams[s.teamId]
          return team?.conference === activeConf
        }).sort((a, b) => a.conferenceRank - b.conferenceRank)
    return confStandings[0]?.losses ?? 0
  }, [standings, leagueStandings, activeTab, save])

  const handleSimSeason = async () => {
    if (!save) return
    if (!save.league.scheduleGenerated) {
      toast.error('Generate a schedule first.')
      return
    }
    if (save.settings.simSpeed === 'normal') {
      toast.info('Tip: Switch to Instant for bulk sim without the fast-forward viewer.', {
        duration: 5000,
      })
    }
    const result = await simSeason()
    if (result.cancelled) {
      toast.info(`Sim cancelled. ${result.gamesSimulated} games simulated.`)
    } else if (result.phaseTransitioned) {
      const label = result.nextPhase === 'play_in' ? 'Play-In' : 'Playoffs'
      toast.success(`Regular season complete! ${result.gamesSimulated} games simulated. Moving to ${label}.`)
    } else if (result.gamesSimulated > 0) {
      toast.success(`Season sim complete. ${result.gamesSimulated} games simulated.`)
    }
  }

  const handleSimToPlayoffs = async () => {
    if (!save) return
    if (!save.league.scheduleGenerated) {
      toast.error('Generate a schedule first.')
      return
    }
    const result = await simSeason()
    if (result.phaseTransitioned) {
      toast.success('Regular season complete! Moving to playoffs...')
      void navigate('/playoffs')
    } else if (result.cancelled) {
      toast.info(`Sim cancelled. ${result.gamesSimulated} games simulated.`)
    } else {
      toast.success(`Season sim complete. ${result.gamesSimulated} games simulated.`)
    }
  }

  if (!save) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Season"
          title="Standings"
          description="Start a new league to see standings."
        />
      </div>
    )
  }

  const displayedStandings = activeTab === 'East' ? eastStandings : activeTab === 'West' ? westStandings : leagueStandings
  const userTeamId = save.league.userTeamId

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Season"
        title="Standings"
        description={`${save.league.rules.seasonLabel} regular season`}
        actions={
          save.league.phase === 'regular_season' && !save.league.playoffBracket ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimSeason}
                disabled={simRunning}
              >
                <FastForward className="size-3.5 mr-1" />
                Sim Season
              </Button>
              <Button
                size="sm"
                onClick={handleSimToPlayoffs}
                disabled={simRunning}
              >
                <Trophy className="size-3.5 mr-1" />
                Sim to Playoffs
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-5 py-3">
            <div className="flex items-center gap-1">
              {(['East', 'West', 'League'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {simRunning && (
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Simming {simProgress?.percentage ?? 0}%...
              </span>
            )}
          </div>

          {simRunning && simProgress && (
            <div className="border-b border-[var(--color-line-soft)] px-5 py-3">
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
            </div>
          )}

          <div className="md:hidden divide-y divide-[var(--color-line-soft)]">
            {displayedStandings.map((standing, idx) => {
              const team = save.league.teams[standing.teamId]
              if (!team) return null
              const isUser = standing.teamId === userTeamId
              const rank = activeTab === 'League' ? idx + 1 : standing.conferenceRank
              return (
                <div
                  key={standing.teamId}
                  className={`px-4 py-3 space-y-2 ${isUser ? 'bg-[var(--color-primary)]/5' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-[var(--color-muted-foreground)] w-5">{rank}</span>
                      <TeamLogo team={team} size={28} />
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${isUser ? 'text-[var(--color-primary)]' : ''}`}>
                          {team.abbreviation}
                        </div>
                        <div className="text-[10px] text-[var(--color-muted-foreground)] truncate">
                          {team.city} {team.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm">{standing.wins}-{standing.losses}</div>
                      <div className="text-[10px] text-[var(--color-muted-foreground)]">
                        {formatWinPct(standing.winPct)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <TeamDirectionBadge direction={team.direction} />
                    {standing.eliminated && (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-medium text-red-500">
                        Eliminated
                      </span>
                    )}
                    {standing.clinchedPlayoff && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-500">
                        Clinched
                      </span>
                    )}
                    <span className="text-[var(--color-muted-foreground)]">
                      L10: {formatLast10(standing.last10)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line-soft)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  <th className="px-5 py-2.5 text-left w-8 sticky left-0 z-10 bg-[var(--color-surface-1)]">#</th>
                  <th className="px-3 py-2.5 text-left sticky left-8 z-10 bg-[var(--color-surface-1)] min-w-[180px]">Team</th>
                  <th className="px-3 py-2.5 text-right">W-L</th>
                  <th className="px-3 py-2.5 text-right">PCT</th>
                  <th className="px-3 py-2.5 text-right">GB</th>
                  <th className="px-3 py-2.5 text-right">HOME</th>
                  <th className="px-3 py-2.5 text-right">AWAY</th>
                  <th className="px-3 py-2.5 text-right">L10</th>
                  <th className="px-3 py-2.5 text-right">DIFF</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedStandings.map((standing, idx) => {
                  const team = save.league.teams[standing.teamId]
                  if (!team) return null
                  const isUser = standing.teamId === userTeamId
                  const isPlayoffCutoff = idx === 7 && activeTab !== 'League'
                  const rank = activeTab === 'League' ? idx + 1 : standing.conferenceRank

                  return (
                    <tr
                      key={standing.teamId}
                      className={`border-b border-[var(--color-line-soft)] transition-colors ${
                        isUser
                          ? 'bg-[var(--color-primary)]/5'
                          : standing.eliminated
                          ? 'bg-red-500/5 opacity-60'
                          : 'hover:bg-[var(--color-surface-2)]'
                      } ${isPlayoffCutoff ? 'border-b-2 border-b-[var(--color-primary)]' : ''}`}
                    >
                      <td className="px-5 py-2.5 text-xs text-[var(--color-muted-foreground)] sticky left-0 z-10 bg-inherit">
                        {rank}
                      </td>
                      <td className="px-3 py-2.5 sticky left-8 z-10 bg-inherit min-w-[180px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TeamLogo team={team} size={28} />
                          <span className={`text-sm font-medium ${isUser ? 'text-[var(--color-primary)]' : ''}`}>
                            {team.abbreviation}
                          </span>
                          <TeamDirectionBadge direction={team.direction} />
                          <span className="text-[10px] text-[var(--color-muted-foreground)]">
                            {team.city} {team.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {standing.wins}-{standing.losses}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {formatWinPct(standing.winPct)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {computeGB(leaderWins, leaderLosses, standing.wins, standing.losses)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-[var(--color-muted-foreground)]">
                        {standing.homeWins}-{standing.homeLosses}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-[var(--color-muted-foreground)]">
                        {standing.awayWins}-{standing.awayLosses}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-[var(--color-muted-foreground)]">
                        {formatLast10(standing.last10)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        <span className={
                          standing.pointDifferentialPerGame > 0
                            ? 'text-emerald-500'
                            : standing.pointDifferentialPerGame < 0
                            ? 'text-red-500'
                            : 'text-[var(--color-muted-foreground)]'
                        }>
                          {standing.pointDifferentialPerGame > 0 ? '+' : ''}{standing.pointDifferentialPerGame.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {standing.eliminated && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            Eliminated
                          </span>
                        )}
                        {standing.clinchedPlayoff && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                            Clinched
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {userStanding && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  Your Team
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-medium">
                    {save.league.teams[userStanding.teamId]?.city}{' '}
                    {save.league.teams[userStanding.teamId]?.name}
                  </span>
                  <span className="ml-2 text-[var(--color-muted-foreground)]">
                    {userStanding.wins}-{userStanding.losses} ({formatWinPct(userStanding.winPct)})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  Conference Rank
                </div>
                <div className="font-display text-2xl">
                  {userStanding.conferenceRank}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
