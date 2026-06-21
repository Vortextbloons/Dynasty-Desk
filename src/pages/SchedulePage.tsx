import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, CalendarDays, FastForward, ChevronRight } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/team/TeamLogo'
import { toast } from 'sonner'
import type { ScheduledGame } from '@/game/models/game'
import { formatGameDate, formatGameDateShort } from '@/lib/format'

type ResultFilter = 'all' | 'W' | 'L'

export function SchedulePage() {
  const save = useGameStore((s) => s.save)
  const simOneGame = useGameStore((s) => s.simOneGame)
  const simDay = useGameStore((s) => s.simDay)
  const simWeek = useGameStore((s) => s.simWeek)
  const simUntilUserGame = useGameStore((s) => s.simUntilUserGame)
  const generateSeasonSchedule = useGameStore((s) => s.generateSeasonSchedule)
  const navigate = useNavigate()

  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')

  const userGames = useMemo(() => {
    if (!save) return []
    const teamId = save.league.userTeamId
    return Object.values(save.league.games)
      .filter(
        (g): g is NonNullable<typeof g> =>
          g !== undefined &&
          (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
          g.status === 'final',
      )
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [save])

  const userScheduledGames = useMemo(() => {
    if (!save) return []
    const teamId = save.league.userTeamId
    return Object.values(save.league.games)
      .filter(
        (g): g is NonNullable<typeof g> =>
          g !== undefined &&
          (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
          g.status === 'scheduled',
      )
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [save])

  const filteredGames = useMemo(() => {
    const all = [...userGames, ...userScheduledGames]
    if (resultFilter === 'all') return all
    return all.filter((g) => {
      if (g.status !== 'final') return false
      const teamId = save?.league.userTeamId
      if (!teamId) return false
      const isHome = g.homeTeamId === teamId
      const won = isHome ? (g.homeScore ?? 0) > (g.awayScore ?? 0) : (g.awayScore ?? 0) > (g.homeScore ?? 0)
      return resultFilter === 'W' ? won : !won
    })
  }, [userGames, userScheduledGames, resultFilter, save])

  const groupedGames = useMemo(() => {
    const groups = new Map<string, ScheduledGame[]>()
    for (const game of filteredGames) {
      const existing = groups.get(game.date)
      if (existing) {
        existing.push(game)
      } else {
        groups.set(game.date, [game])
      }
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredGames])

  const nextUserGame = useMemo(() => {
    return userScheduledGames[0] ?? null
  }, [userScheduledGames])

  if (!save) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Season"
          title="Schedule"
          description="Start a new league to see your schedule."
        />
      </div>
    )
  }

  const teamId = save.league.userTeamId
  const userTeam = save.league.teams[teamId]

  const handleSimGame = async (gameId: string) => {
    const result = await simOneGame(gameId)
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

  const handleSimToMyGame = async () => {
    const r = await simUntilUserGame()
    toast.success(`Simulated ${r.gamesSimulated} game${r.gamesSimulated === 1 ? '' : 's'}.`)
  }

  const handleGenerateSchedule = () => {
    generateSeasonSchedule()
  }

  const totalGames = userGames.length + userScheduledGames.length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Season"
        title="Schedule"
        description={`${userTeam?.city ?? ''} ${userTeam?.name ?? ''} — ${save.league.rules.seasonLabel}`}
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line-soft)] px-5 py-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-3.5 text-[var(--color-muted-foreground)]" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                {totalGames} game{totalGames === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'W', 'L'] as ResultFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setResultFilter(f)}
                  className={`rounded px-2 py-1 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                    resultFilter === f
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>

          {totalGames === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-sm text-[var(--color-muted-foreground)]">
                No games scheduled yet.
              </div>
              <Button size="sm" className="mt-4" onClick={handleGenerateSchedule}>
                Generate Season Schedule
              </Button>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {groupedGames.map(([date, games]) => (
                <div key={date}>
                  <div className="sticky top-0 z-10 border-b border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-5 py-2">
                    <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      {formatGameDate(date)}
                    </span>
                  </div>
                  <ul className="divide-y divide-[var(--color-line-soft)]">
                    {games.map((game) => {
                      const home = save.league.teams[game.homeTeamId]
                      const away = save.league.teams[game.awayTeamId]
                      const isHome = game.homeTeamId === teamId
                      const opponent = isHome ? away : home
                      const final = game.status === 'final'

                      let result: 'W' | 'L' | null = null
                      if (final) {
                        const userScore = isHome ? game.homeScore : game.awayScore
                        const oppScore = isHome ? game.awayScore : game.homeScore
                        result = (userScore ?? 0) > (oppScore ?? 0) ? 'W' : 'L'
                      }

                      const isNextGame = nextUserGame?.id === game.id

                      return (
                        <li
                          key={game.id}
                          className={`flex items-center justify-between gap-4 px-5 py-3 transition-colors ${
                            final ? 'hover:bg-[var(--color-surface-2)]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 text-xs text-[var(--color-muted-foreground)]">
                              {formatGameDateShort(date)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {opponent && <TeamLogo team={opponent} size={24} />}
                                <span className="text-sm font-medium">
                                  {isHome ? 'vs' : '@'} {opponent?.abbreviation ?? '???'}
                                </span>
                                {result && (
                                  <span
                                    className={`inline-flex size-5 items-center justify-center rounded text-[10px] font-bold ${
                                      result === 'W'
                                        ? 'bg-emerald-500/15 text-emerald-500'
                                        : 'bg-red-500/15 text-red-500'
                                    }`}
                                  >
                                    {result}
                                  </span>
                                )}
                                {game.ot && (
                                  <span className="text-[10px] text-[var(--color-muted-foreground)]">
                                    OT
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--color-muted-foreground)]">
                                {isHome ? 'Home' : 'Away'}
                                {final && game.homeScore != null && game.awayScore != null && (
                                  <span className="ml-2 font-mono">
                                    {isHome ? game.homeScore : game.awayScore}–{isHome ? game.awayScore : game.homeScore}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {final ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void navigate(`/game/${game.id}`)}
                              >
                                Box score
                                <ChevronRight className="ml-1 size-3" />
                              </Button>
                            ) : isNextGame ? (
                              <Button
                                size="sm"
                                onClick={() => void handleSimGame(game.id)}
                              >
                                <Play className="mr-1 size-3" /> Sim
                              </Button>
                            ) : (
                              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                                Scheduled
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleSimDay} disabled={!save.league.scheduleGenerated}>
          <CalendarDays className="mr-1 size-3.5" /> Sim Day
        </Button>
        <Button size="sm" variant="secondary" onClick={handleSimWeek} disabled={!save.league.scheduleGenerated}>
          <FastForward className="mr-1 size-3.5" /> Sim Week
        </Button>
        <Button size="sm" variant="secondary" onClick={handleSimToMyGame} disabled={!save.league.scheduleGenerated}>
          <Play className="mr-1 size-3.5" /> Sim to My Game
        </Button>
      </div>
    </div>
  )
}

