import type { PlayoffBracket } from '@/game/models/playoff'
import type { Team } from '@/game/models/team'
import type { Player } from '@/game/models/player'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'
import { TeamLogo } from '@/components/team/TeamLogo'
import { Trophy, Star } from 'lucide-react'

interface ChampionCardProps {
  bracket: PlayoffBracket
  championTeam?: Team
  runnerUpTeam?: Team
  finalsMvp?: Player
}

export function ChampionCard({
  bracket,
  championTeam,
  runnerUpTeam,
  finalsMvp,
}: ChampionCardProps) {
  if (bracket.status !== 'complete' || !bracket.championTeamId) return null

  const championName = championTeam
    ? `${championTeam.city} ${championTeam.name}`
    : 'Champion'
  const runnerUpName = runnerUpTeam
    ? `${runnerUpTeam.city} ${runnerUpTeam.name}`
    : 'Runner-Up'

  const finals = bracket.finals
  const seriesResult = finals
    ? `${finals.higherSeedWins}-${finals.lowerSeedWins}`
    : ''

  return (
    <Card className="border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-3">
          {championTeam && <TeamLogo team={championTeam} size={48} />}
          <Trophy className="size-10 text-[var(--color-primary)]" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary)] mb-1">
              NBA Champion
            </div>
            <div className="font-display text-2xl font-bold">
              {championName}
            </div>
          </div>
          {seriesResult && (
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Defeated {runnerUpName} ({seriesResult})
            </div>
          )}
          {finalsMvp && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-[var(--color-primary)]/10">
              <PlayerHeadshot player={finalsMvp} team={championTeam} size={32} />
              <Star className="size-3.5 text-[var(--color-primary)]" />
              <span className="text-sm font-medium">
                Finals MVP: {finalsMvp.firstName} {finalsMvp.lastName}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
