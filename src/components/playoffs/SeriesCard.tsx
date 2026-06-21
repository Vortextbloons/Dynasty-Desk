import type { PlayoffSeries } from '@/game/models/playoff'
import type { Team } from '@/game/models/team'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/team/TeamLogo'
import { cn } from '@/lib/utils'

interface SeriesCardProps {
  series: PlayoffSeries
  higherTeam?: Team
  lowerTeam?: Team
  onSimSeries?: () => void
  compact?: boolean
}

export function SeriesCard({
  series,
  higherTeam,
  lowerTeam,
  onSimSeries,
  compact = false,
}: SeriesCardProps) {
  const higherName = higherTeam
    ? `${higherTeam.city} ${higherTeam.name}`
    : `Seed ${series.higherSeed}`
  const higherAbbr = higherTeam?.abbreviation ?? `S${series.higherSeed}`
  const lowerName = lowerTeam
    ? `${lowerTeam.city} ${lowerTeam.name}`
    : `Seed ${series.lowerSeed}`
  const lowerAbbr = lowerTeam?.abbreviation ?? `S${series.lowerSeed}`

  const isHigherWinner = series.winnerTeamId === series.higherSeedTeamId
  const isLowerWinner = series.winnerTeamId === series.lowerSeedTeamId
  const isComplete = series.status === 'final'

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            'font-medium',
            isHigherWinner && 'text-[var(--color-primary)] font-bold',
          )}
        >
          {higherAbbr} ({series.higherSeed})
        </span>
        <span className="text-[var(--color-muted-foreground)]">
          {series.higherSeedWins}-{series.lowerSeedWins}
        </span>
        <span
          className={cn(
            'font-medium',
            isLowerWinner && 'text-[var(--color-primary)] font-bold',
          )}
        >
          {lowerAbbr} ({series.lowerSeed})
        </span>
        {series.isUpset && isComplete && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] font-medium">
            UPSET
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            {series.conference === 'Finals'
              ? 'NBA Finals'
              : `Round ${series.round}`}
          </div>
          <div
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              isComplete
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : series.status === 'in_progress'
                  ? 'bg-yellow-500/10 text-yellow-600'
                  : 'bg-[var(--color-muted)]/50 text-[var(--color-muted-foreground)]',
            )}
          >
            {isComplete
              ? `${higherAbbr} ${series.higherSeedWins}-${series.lowerSeedWins} ${lowerAbbr}`
              : series.status === 'in_progress'
                ? `${series.higherSeedWins}-${series.lowerSeedWins}`
                : 'Scheduled'}
          </div>
        </div>

        <div className="space-y-2">
          <div
            className={cn(
              'flex items-center justify-between p-2 rounded',
              isHigherWinner && 'bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-muted-foreground)] w-4 text-center">
                {series.higherSeed}
              </span>
              {higherTeam && <TeamLogo team={higherTeam} size={20} />}
              <span
                className={cn(
                  'text-sm font-medium',
                  isHigherWinner && 'text-[var(--color-primary)]',
                )}
              >
                {higherName}
              </span>
            </div>
            <span className="text-lg font-display font-bold">
              {series.higherSeedWins}
            </span>
          </div>

          <div
            className={cn(
              'flex items-center justify-between p-2 rounded',
              isLowerWinner && 'bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-muted-foreground)] w-4 text-center">
                {series.lowerSeed}
              </span>
              {lowerTeam && <TeamLogo team={lowerTeam} size={20} />}
              <span
                className={cn(
                  'text-sm font-medium',
                  isLowerWinner && 'text-[var(--color-primary)]',
                )}
              >
                {lowerName}
              </span>
            </div>
            <span className="text-lg font-display font-bold">
              {series.lowerSeedWins}
            </span>
          </div>
        </div>

        {series.isUpset && isComplete && (
          <div className="mt-2 text-[10px] text-center text-[var(--color-destructive)] font-medium">
            UPSET
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {!isComplete && onSimSeries && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onSimSeries}
            >
              Sim Series
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
