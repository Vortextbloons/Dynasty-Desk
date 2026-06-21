import type { PlayInBracket } from '@/game/models/playoff'
import type { Team } from '@/game/models/team'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PlayInSectionProps {
  playIn: PlayInBracket
  teams: Record<string, Team>
}

export function PlayInSection({ playIn, teams }: PlayInSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-display font-semibold">Play-In Tournament</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlayInConference conference="East" games={playIn.east} teams={teams} />
        <PlayInConference conference="West" games={playIn.west} teams={teams} />
      </div>
    </div>
  )
}

interface PlayInConferenceProps {
  conference: 'East' | 'West'
  games: import('@/game/models/playoff').PlayInGame[]
  teams: Record<string, Team>
}

function PlayInConference({ conference, games, teams }: PlayInConferenceProps) {
  const game7v8 = games.find((g) => g.matchup === '7v8')
  const game9v10 = games.find((g) => g.matchup === '9v10')
  const finalGame = games.find((g) => g.matchup === 'final_playin')

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] mb-3">
          {conference} Conference
        </div>
        <div className="space-y-3">
          {game7v8 && (
            <PlayInGameRow
              label="7 vs 8"
              homeTeam={teams[game7v8.homeTeamId]}
              awayTeam={teams[game7v8.awayTeamId]}
              winnerId={game7v8.winnerTeamId}
            />
          )}
          {game9v10 && (
            <PlayInGameRow
              label="9 vs 10"
              homeTeam={teams[game9v10.homeTeamId]}
              awayTeam={teams[game9v10.awayTeamId]}
              winnerId={game9v10.winnerTeamId}
            />
          )}
          {finalGame?.homeTeamId && (
            <PlayInGameRow
              label="Final Play-In"
              homeTeam={teams[finalGame.homeTeamId]}
              awayTeam={teams[finalGame.awayTeamId]}
              winnerId={finalGame.winnerTeamId}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface PlayInGameRowProps {
  label: string
  homeTeam?: Team
  awayTeam?: Team
  winnerId?: string
}

function PlayInGameRow({ label, homeTeam, awayTeam, winnerId }: PlayInGameRowProps) {
  const homeAbbr = homeTeam?.abbreviation ?? 'TBD'
  const awayAbbr = awayTeam?.abbreviation ?? 'TBD'

  const homeWon = winnerId === homeTeam?.id
  const awayWon = winnerId === awayTeam?.id
  const isComplete = Boolean(winnerId)

  return (
    <div className="flex items-center justify-between text-sm p-2 rounded bg-[var(--color-surface-2)]">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] w-16">
        {label}
      </span>
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span
          className={cn(
            'font-medium',
            homeWon && 'text-[var(--color-primary)] font-bold',
            isComplete && !homeWon && 'text-[var(--color-muted-foreground)]',
          )}
        >
          {homeAbbr}
        </span>
        <span className="text-[var(--color-muted-foreground)]">vs</span>
        <span
          className={cn(
            'font-medium',
            awayWon && 'text-[var(--color-primary)] font-bold',
            isComplete && !awayWon && 'text-[var(--color-muted-foreground)]',
          )}
        >
          {awayAbbr}
        </span>
      </div>
      <span className="text-[10px] text-[var(--color-muted-foreground)] w-12 text-right">
        {isComplete ? (homeWon ? `${homeAbbr} wins` : `${awayAbbr} wins`) : 'Pending'}
      </span>
    </div>
  )
}
