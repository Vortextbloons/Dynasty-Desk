import { useMemo, useState } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { recomputeStandings, computeGB, formatLast10 } from '@/game/league/standingsEngine'
import { toast } from 'sonner'
import { FastForward } from 'lucide-react'

type Tab = 'East' | 'West' | 'League'

export function StandingsPage() {
  const save = useGameStore((s) => s.save)
  const simSeason = useGameStore((s) => s.simSeason)
  const simRunning = useGameStore((s) => s.simRunning)
  const simProgress = useGameStore((s) => s.simProgress)
  const cancelSimulation = useGameStore((s) => s.cancelSimulation)
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
      toast.info('Tip: Switch to instant speed for faster bulk sim.', { duration: 5000 })
    }
    await simSeason()
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
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSimSeason}
              disabled={simRunning}
            >
              <FastForward className="mr-1 size-3.5" />
              {simRunning ? `Simming ${simProgress?.percentage ?? 0}%...` : 'Sim Season'}
            </Button>
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

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line-soft)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  <th className="px-5 py-2.5 text-left w-8">#</th>
                  <th className="px-3 py-2.5 text-left">Team</th>
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
                      <td className="px-5 py-2.5 text-xs text-[var(--color-muted-foreground)]">
                        {rank}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isUser ? 'text-[var(--color-primary)]' : ''}`}>
                            {team.abbreviation}
                          </span>
                          <span className="text-[10px] text-[var(--color-muted-foreground)]">
                            {team.city} {team.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {standing.wins}-{standing.losses}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {standing.winPct.toFixed(3)}
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
                            X
                          </span>
                        )}
                        {standing.clinchedPlayoff && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                            Y
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
                    {userStanding.wins}-{userStanding.losses} ({userStanding.winPct.toFixed(3)})
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
