import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { TeamComparisonBar } from '@/components/sim/TeamComparisonBar'
import { BoxScoreTable } from '@/components/sim/BoxScoreTable'
import { KeyPlaysList } from '@/components/sim/KeyPlaysList'
import { TopPerformersCards } from '@/components/sim/TopPerformersCards'
import { Button } from '@/components/ui/button'
import type { Player } from '@/game/models'

export function BoxScorePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const save = useGameStore((s) => s.save)
  const simNextGame = useGameStore((s) => s.simNextGame)

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

  const game = id ? save.league.games[id] : null
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
  const box = game.boxScore

  if (!box || game.status !== 'final') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Box Score"
          title={`${away?.abbreviation ?? ''} @ ${home?.abbreviation ?? ''}`}
          description={`${game.date} — not yet simulated`}
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

  const playerLookup = new Map<string, { firstName: string; lastName: string; position: string }>()
  for (const ps of Object.values(box.playerStats)) {
    const p = save.league.players[ps.playerId]
    if (p) {
      playerLookup.set(p.id, {
        firstName: p.firstName,
        lastName: p.lastName,
        position: p.position,
      })
    }
  }

  const teamLookup = new Map<string, { abbreviation: string; name: string; colors: { primary: string; secondary: string } }>()
  if (home) teamLookup.set(home.id, { abbreviation: home.abbreviation, name: home.name, colors: home.colors })
  if (away) teamLookup.set(away.id, { abbreviation: away.abbreviation, name: away.name, colors: away.colors })

  const headshotLookup = new Map<string, Pick<Player, 'id' | 'firstName' | 'lastName' | 'position' | 'teamId'>>()
  for (const ps of Object.values(box.playerStats)) {
    const p = save.league.players[ps.playerId]
    if (p) {
      headshotLookup.set(p.id, {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        position: p.position,
        teamId: p.teamId,
      })
    }
  }

  const allPlayers = [...homePlayers, ...awayPlayers]

  const handleSimNext = async () => {
    const result = await simNextGame()
    if ('gameId' in result) {
      void navigate(`/game/${result.gameId}`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Final"
        title={`${away?.name ?? 'Away'} ${box.awayScore} — ${box.homeScore} ${home?.name ?? 'Home'}`}
        description={`${game.date} · ${home?.city ?? ''} ${home?.name ?? ''} Arena${box.overtimeOccurred ? ' · OT' : ''}`}
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
    </div>
  )
}
