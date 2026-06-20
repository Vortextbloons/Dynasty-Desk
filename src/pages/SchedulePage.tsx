import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, CalendarDays } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function SchedulePage() {
  const save = useGameStore((s) => s.save)
  const simOneGame = useGameStore((s) => s.simOneGame)
  const ensureSchedule = useGameStore((s) => s.ensureSchedule)
  const navigate = useNavigate()

  const games = useMemo(() => {
    if (!save) return []
    const teamId = save.league.userTeamId
    return Object.values(save.league.games)
      .filter(
        (g): g is NonNullable<typeof g> =>
          g !== undefined && (g.homeTeamId === teamId || g.awayTeamId === teamId),
      )
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [save])

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

  const handleGenerate = () => {
    ensureSchedule(3)
  }

  const handleSim = async (gameId: string) => {
    const result = await simOneGame(gameId)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    void navigate(`/game/${result.gameId}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Season"
        title="Schedule"
        description="Upcoming games for your team. Tap Sim to play any matchup."
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line-soft)] px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-3.5" />
              {games.length} game{games.length === 1 ? '' : 's'}
            </div>
            {games.length === 0 && (
              <Button size="sm" variant="secondary" onClick={handleGenerate}>
                Generate schedule
              </Button>
            )}
          </div>
          {games.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No games scheduled. Generate one to get started.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line-soft)]">
              {games.map((game) => {
                const home = save.league.teams[game.homeTeamId]
                const away = save.league.teams[game.awayTeamId]
                const isHome = game.homeTeamId === teamId
                const opponent = isHome ? away : home
                const final = game.status === 'final'
                return (
                  <li
                    key={game.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-[var(--color-muted-foreground)]">
                        {game.date}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {isHome ? 'vs' : '@'} {opponent?.city ?? ''} {opponent?.name ?? 'Opponent'}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                          {isHome ? 'Home' : 'Away'} · {opponent?.conference ?? ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {final ? (
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm">
                            {game.awayScore} – {game.homeScore}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/game/${game.id}`)}
                          >
                            Box score
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSim(game.id)}
                        >
                          <Play className="mr-1 size-3" /> Sim
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
