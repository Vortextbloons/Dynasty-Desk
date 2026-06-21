import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlayoffBracket, PlayoffSeries } from '@/game/models'
import { useGameStore } from '@/store/useGameStore'

interface PlayoffBracketChartProps {
  bracket: PlayoffBracket
}

function SeriesCard({ series }: { series: PlayoffSeries }) {
  const teams = useGameStore((s) => s.save?.league.teams)

  const getTeamName = (teamId: string) => teams?.[teamId]?.name ?? teamId

  return (
    <div className="border border-[var(--color-line-soft)] rounded-md p-2 space-y-1 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium truncate flex-1">{getTeamName(series.higherSeedTeamId)}</span>
        <span className="font-mono ml-2">{series.higherSeedWins}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-medium truncate flex-1">{getTeamName(series.lowerSeedTeamId)}</span>
        <span className="font-mono ml-2">{series.lowerSeedWins}</span>
      </div>
      {series.winnerTeamId && (
        <div className="text-[10px] text-[var(--color-primary)] text-center pt-1">
          {getTeamName(series.winnerTeamId)} wins
        </div>
      )}
    </div>
  )
}

export function PlayoffBracketChart({ bracket }: PlayoffBracketChartProps) {
  if (!bracket) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-sm text-[var(--color-muted-foreground)]">
            No playoff bracket available
          </div>
        </CardContent>
      </Card>
    )
  }

  const eastRounds = groupByRound(bracket.east)
  const westRounds = groupByRound(bracket.west)
  const allRounds: { label: string; series: PlayoffSeries[] }[] = []

  const maxRounds = Math.max(eastRounds.length, westRounds.length)
  for (let i = 0; i < maxRounds; i++) {
    const east = eastRounds[i] ?? []
    const west = westRounds[i] ?? []
    allRounds.push({
      label: getRoundLabel(i + 1),
      series: [...east, ...west],
    })
  }
  if (bracket.finals) {
    allRounds.push({ label: 'Finals', series: [bracket.finals] })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">Playoff Bracket</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-[600px]">
            {allRounds.map((round, roundIdx) => (
              <div key={roundIdx} className="flex-1 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] text-center mb-3">
                  {round.label}
                </div>
                {round.series.map((series, seriesIdx) => (
                  <SeriesCard key={seriesIdx} series={series} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function groupByRound(series: PlayoffSeries[]): PlayoffSeries[][] {
  const rounds: Map<number, PlayoffSeries[]> = new Map()
  for (const s of series) {
    const existing = rounds.get(s.round) ?? []
    existing.push(s)
    rounds.set(s.round, existing)
  }
  return Array.from(rounds.values())
}

function getRoundLabel(round: number): string {
  switch (round) {
    case 1: return 'First Round'
    case 2: return 'Conf. Semis'
    case 3: return 'Conf. Finals'
    case 4: return 'Finals'
    default: return `Round ${round}`
  }
}
