import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { toast } from 'sonner'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { TeamComparisonBar } from '@/components/sim/TeamComparisonBar'
import { BoxScoreTable } from '@/components/sim/BoxScoreTable'
import { KeyPlaysList } from '@/components/sim/KeyPlaysList'
import { TopPerformersCards } from '@/components/sim/TopPerformersCards'
import { Button } from '@/components/ui/button'
import type { Player } from '@/game/models'
import { formatGameDate } from '@/lib/format'

export function BoxScorePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const save = useGameStore((s) => s.save)
  const simNextGame = useGameStore((s) => s.simNextGame)

  const game = id && save ? save.league.games[id] ?? null : null
  const box = game?.boxScore ?? null

  const nextUserGame = useMemo(() => {
    if (!save) return null
    const teamId = save.league.userTeamId
    const today = save.league.currentDate
    const games = Object.values(save.league.games)
      .filter(
        (g): g is NonNullable<typeof g> =>
          g?.status === 'scheduled' &&
          (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
          g.date >= today,
      )
      .sort((a, b) => a.date.localeCompare(b.date))
    return games[0] ?? null
  }, [save])

  const handleSimNext = async () => {
    const result = await simNextGame()
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    void navigate(`/game/${result.gameId}`)
  }

  if (!save) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Box Score"
          title="Game not found"
          description="No active save. Start a new league to play games."
        />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Box Score"
          title="Game not found"
          description="This game does not exist in the current save."
        />
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back to dashboard
        </Link>
      </div>
    )
  }

  const home = save.league.teams[game.homeTeamId]
  const away = save.league.teams[game.awayTeamId]

  if (!box || game.status !== 'final') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Box Score"
          title={`${away?.abbreviation ?? ''} @ ${home?.abbreviation ?? ''}`}
          description={`${formatGameDate(game.date)} — not yet simulated`}
        />
        <Card>
          <CardContent className="p-6 text-sm text-[var(--color-muted-foreground)]">
            This game has not been simulated yet. Use the dashboard to sim this game.
          </CardContent>
        </Card>
        <Link
          to="/schedule"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back to schedule
        </Link>
      </div>
    )
  }

  const homePlayers = Object.values(box.playerStats).filter((p) => p.teamId === game.homeTeamId)
  const awayPlayers = Object.values(box.playerStats).filter((p) => p.teamId === game.awayTeamId)

  const playerLookup = new Map<
    string,
    { firstName: string; lastName: string; position: string; externalId?: string }
  >()
  for (const ps of Object.values(box.playerStats)) {
    const p = save.league.players[ps.playerId]
    if (p) {
      playerLookup.set(p.id, {
        firstName: p.firstName,
        lastName: p.lastName,
        position: p.position,
        externalId: p.externalId,
      })
    }
  }

  const teamLookup = new Map<string, { abbreviation: string; name: string; colors: { primary: string; secondary: string } }>()
  if (home) teamLookup.set(home.id, { abbreviation: home.abbreviation, name: home.name, colors: home.colors })
  if (away) teamLookup.set(away.id, { abbreviation: away.abbreviation, name: away.name, colors: away.colors })

  const headshotLookup = new Map<
    string,
    Pick<Player, 'id' | 'firstName' | 'lastName' | 'position' | 'teamId' | 'externalId'>
  >()
  for (const ps of Object.values(box.playerStats)) {
    const p = save.league.players[ps.playerId]
    if (p) {
      headshotLookup.set(p.id, {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        position: p.position,
        teamId: p.teamId,
        externalId: p.externalId,
      })
    }
  }

  const allPlayers = [...homePlayers, ...awayPlayers]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Final"
        title={`${away?.name ?? 'Away'} ${box.awayScore} — ${box.homeScore} ${home?.name ?? 'Home'}`}
        description={`${formatGameDate(game.date)} · ${home?.arena ?? `${home?.city ?? ''} ${home?.name ?? ''} Arena`}${box.overtimeOccurred ? ' · OT' : ''}`}
      />

      <div className="flex items-center justify-between">
        <Link
          to="/schedule"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" /> Back to schedule
        </Link>
        <Button onClick={handleSimNext} size="sm">
          Sim next game
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TeamComparisonBar
            home={{ team: home ?? null, stats: box.teamStats.home }}
            away={{ team: away ?? null, stats: box.teamStats.away }}
          />
        </div>
        <div className="lg:col-span-2">
          <KeyPlaysList plays={box.keyPlays} playerLookup={playerLookup} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TopPerformersCards
          label="Points"
          players={allPlayers}
          playerLookup={headshotLookup}
          teamLookup={teamLookup}
          stat={(p) => p.points}
        />
        <TopPerformersCards
          label="Rebounds"
          players={allPlayers}
          playerLookup={headshotLookup}
          teamLookup={teamLookup}
          stat={(p) => p.totalRebounds}
        />
        <TopPerformersCards
          label="Assists"
          players={allPlayers}
          playerLookup={headshotLookup}
          teamLookup={teamLookup}
          stat={(p) => p.assists}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BoxScoreTable
          players={homePlayers}
          playerLookup={playerLookup}
          title={`${home?.abbreviation ?? 'Home'} — Box Score`}
        />
        <BoxScoreTable
          players={awayPlayers}
          playerLookup={playerLookup}
          title={`${away?.abbreviation ?? 'Away'} — Box Score`}
        />
      </div>

      {nextUserGame && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  Next Game
                </div>
                <div className="mt-1 text-sm font-medium">
                  {nextUserGame.homeTeamId === save.league.userTeamId ? 'vs' : '@'}{' '}
                  {save.league.teams[nextUserGame.homeTeamId === save.league.userTeamId ? nextUserGame.awayTeamId : nextUserGame.homeTeamId]?.abbreviation ?? '???'}
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  {nextUserGame.date}
                </div>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  const result = await useGameStore.getState().simOneGame(nextUserGame.id)
                  if ('error' in result) {
                    toast.error(result.error)
                    return
                  }
                  void navigate(`/game/${result.gameId}`)
                }}
              >
                <Play className="mr-1 size-3" /> Sim
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
