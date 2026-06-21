import type { PlayerGameStats } from '@/game/models'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'

type TeamColors = Pick<StaticTeam, 'colors'>

interface Props {
  label: string
  players: PlayerGameStats[]
  playerLookup: Map<
    string,
    Pick<Player, 'id' | 'firstName' | 'lastName' | 'position' | 'teamId' | 'externalId'>
  >
  stat: (p: PlayerGameStats) => number
  teamLookup: Map<string, { abbreviation: string; name: string; colors: TeamColors['colors'] }>
}

export function TopPerformersCards({ label, players, playerLookup, stat, teamLookup }: Props) {
  const top = [...players]
    .filter((p) => stat(p) > 0)
    .sort((a, b) => stat(b) - stat(a))
    .slice(0, 3)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Top — {label}
        </div>
        {top.length === 0 ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">No data.</div>
        ) : (
          <div className="space-y-2">
            {top.map((p) => {
              const meta = playerLookup.get(p.playerId)
              const team = meta?.teamId ? teamLookup.get(meta.teamId) : undefined
              return (
                <div
                  key={p.playerId}
                  className="flex items-center gap-3 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-2.5"
                >
                  {meta && (
                    <PlayerHeadshot
                      player={{
                        firstName: meta.firstName,
                        lastName: meta.lastName,
                        externalId: meta.externalId,
                      }}
                      team={team ?? undefined}
                      size={40}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">
                      {meta ? `${meta.firstName} ${meta.lastName}` : p.playerId}
                    </div>
                    <div className="text-[10px] text-[var(--color-muted-foreground)]">
                      {team?.abbreviation ?? ''}
                      {meta?.position ? ` · ${meta.position}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 font-display text-xl tabular-nums">{stat(p)}</div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
