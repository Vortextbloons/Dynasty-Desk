import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/team/TeamLogo'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { recomputeStandings } from '@/game/league/standingsEngine'
import type { Player } from '@/game/models'

export function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const save = useGameStore((s) => s.save)

  const team = useMemo(() => {
    if (!save || !id) return null
    return save.league.teams[id] ?? null
  }, [save, id])

  const rosterPlayers = useMemo<Player[]>(() => {
    if (!save || !team) return []
    return team.roster
      .map((pid) => save.league.players[pid])
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .sort((a, b) => b.ratings.overall - a.ratings.overall)
  }, [save, team])

  const standings = useMemo(() => {
    if (!save || !team) return null
    const recomputed = recomputeStandings(
      save.league.games,
      save.league.teams,
      save.league.rules.seasonLabel,
      save.league.rules.regularSeasonGames,
    )
    return recomputed[team.id] ?? null
  }, [save, team])

  if (!team) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Team"
          title="Team not found"
          description="No team matches this ID."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/standings">
                <ArrowLeft className="size-4" /> Standings
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team"
        title={`${team.city} ${team.name}`}
        description={
          team.arena
            ? `${team.arena}${team.capacity ? ` (${team.capacity.toLocaleString()})` : ''} · ${team.conference} Conference · ${team.division} Division`
            : `${team.conference} Conference · ${team.division} Division`
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/standings">
              <ArrowLeft className="size-4" /> Standings
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-4 mb-2">
        <TeamLogo team={team} size={64} />
        {standings && (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            <span className="font-mono font-medium text-[var(--color-foreground)]">
              {standings.wins}-{standings.losses}
            </span>
            <span className="ml-2">({standings.winPct ? (standings.winPct * 100).toFixed(1) : '.000'}%)</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">
            Roster ({rosterPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--color-line-soft)]">
            {rosterPlayers.map((player) => (
              <Link
                key={player.id}
                to={`/player/${player.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]/60 transition-colors"
              >
                <PlayerHeadshot player={player} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm group-hover:text-[var(--color-primary)] transition-colors">
                    {player.firstName} {player.lastName}
                  </div>
                  <div className="text-[10px] text-[var(--color-muted-foreground)]">
                    {player.position} · OVR {player.ratings.overall}
                  </div>
                </div>
                <div className="text-xs font-mono text-[var(--color-muted-foreground)]">
                  {player.age} yrs
                </div>
              </Link>
            ))}
            {rosterPlayers.length === 0 && (
              <div className="px-4 py-6 text-sm text-[var(--color-muted-foreground)]">
                No players on roster.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
