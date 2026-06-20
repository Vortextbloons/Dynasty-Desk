import type { PlayoffSeries } from '@/game/models/playoff'
import type { Team } from '@/game/models/team'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FinalsCardProps {
  finals: PlayoffSeries
  higherTeam?: Team
  lowerTeam?: Team
  onSimSeries?: () => void
}

export function FinalsCard({
  finals,
  higherTeam,
  lowerTeam,
  onSimSeries,
}: FinalsCardProps) {
  const higherName = higherTeam
    ? `${higherTeam.city} ${higherTeam.name}`
    : 'TBD'
  const higherAbbr = higherTeam?.abbreviation ?? 'TBD'
  const lowerName = lowerTeam
    ? `${lowerTeam.city} ${lowerTeam.name}`
    : 'TBD'
  const lowerAbbr = lowerTeam?.abbreviation ?? 'TBD'

  const isComplete = finals.status === 'final'
  const isHigherWinner = finals.winnerTeamId === finals.higherSeedTeamId
  const isLowerWinner = finals.winnerTeamId === finals.lowerSeedTeamId

  return (
    <Card className="border-[var(--color-primary)]/20">
      <CardContent className="p-5">
        <div className="text-center mb-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary)]">
            NBA Finals
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-display font-bold',
                isHigherWinner && 'text-[var(--color-primary)]',
              )}
            >
              {higherAbbr}
            </div>
            <div className="text-xs text-[var(--color-muted-foreground)] mt-1">
              {higherName}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-3xl font-display font-bold">
              {finals.higherSeedWins} - {finals.lowerSeedWins}
            </div>
            <div className="text-[10px] text-[var(--color-muted-foreground)] mt-1">
              {isComplete ? 'Final' : 'Series'}
            </div>
          </div>

          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-display font-bold',
                isLowerWinner && 'text-[var(--color-primary)]',
              )}
            >
              {lowerAbbr}
            </div>
            <div className="text-xs text-[var(--color-muted-foreground)] mt-1">
              {lowerName}
            </div>
          </div>
        </div>

        {finals.isUpset && isComplete && (
          <div className="text-center mt-3 text-[10px] text-[var(--color-destructive)] font-medium">
            UPSET
          </div>
        )}

        {!isComplete && onSimSeries && (
          <div className="mt-4 flex justify-center">
            <Button size="sm" variant="outline" onClick={onSimSeries}>
              Sim Finals
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
