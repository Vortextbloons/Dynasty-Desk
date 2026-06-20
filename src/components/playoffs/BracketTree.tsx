import type { PlayoffSeries } from '@/game/models/playoff'
import type { Team } from '@/game/models/team'
import { SeriesCard } from './SeriesCard'

interface BracketTreeProps {
  series: PlayoffSeries[]
  teams: Record<string, Team>
  onSimSeries: (seriesId: string) => void
}

export function BracketTree({ series, teams, onSimSeries }: BracketTreeProps) {
  const rounds = [
    { label: 'First Round', round: 1 as const },
    { label: 'Conf. Semis', round: 2 as const },
    { label: 'Conf. Finals', round: 3 as const },
  ]

  const eastSeries = series.filter((s) => s.conference === 'East')
  const westSeries = series.filter((s) => s.conference === 'West')

  return (
    <div className="space-y-8">
      <ConferenceBracket
        conference="East"
        series={eastSeries}
        teams={teams}
        rounds={rounds}
        onSimSeries={onSimSeries}
      />
      <ConferenceBracket
        conference="West"
        series={westSeries}
        teams={teams}
        rounds={rounds}
        onSimSeries={onSimSeries}
      />
    </div>
  )
}

interface ConferenceBracketProps {
  conference: 'East' | 'West'
  series: PlayoffSeries[]
  teams: Record<string, Team>
  rounds: { label: string; round: 1 | 2 | 3 }[]
  onSimSeries: (seriesId: string) => void
}

function ConferenceBracket({
  conference,
  series,
  teams,
  rounds,
  onSimSeries,
}: ConferenceBracketProps) {
  return (
    <div>
      <h3 className="text-lg font-display font-semibold mb-4">
        {conference} Conference
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {rounds.map(({ label, round }) => {
          const roundSeries = series
            .filter((s) => s.round === round)
            .sort((a, b) => a.id.localeCompare(b.id))

          return (
            <div key={round}>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] mb-2">
                {label}
              </div>
              <div className="space-y-3">
                {roundSeries.map((s) => (
                  <SeriesCard
                    key={s.id}
                    series={s}
                    higherTeam={teams[s.higherSeedTeamId]}
                    lowerTeam={teams[s.lowerSeedTeamId]}
                    onSimSeries={() => onSimSeries(s.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
