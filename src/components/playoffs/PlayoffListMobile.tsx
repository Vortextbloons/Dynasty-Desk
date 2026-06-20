import type { PlayoffSeries } from '@/game/models/playoff'
import type { Team } from '@/game/models/team'
import { SeriesCard } from './SeriesCard'
import { getSeriesRoundLabel } from '@/game/models/playoff'

interface PlayoffListMobileProps {
  series: PlayoffSeries[]
  teams: Record<string, Team>
  onSimSeries: (seriesId: string) => void
}

export function PlayoffListMobile({
  series,
  teams,
  onSimSeries,
}: PlayoffListMobileProps) {
  const eastSeries = series
    .filter((s) => s.conference === 'East')
    .sort((a, b) => a.round - b.round)
  const westSeries = series
    .filter((s) => s.conference === 'West')
    .sort((a, b) => a.round - b.round)

  const rounds = [1, 2, 3] as const

  return (
    <div className="space-y-6">
      <ConferenceList
        conference="East"
        series={eastSeries}
        teams={teams}
        rounds={rounds}
        onSimSeries={onSimSeries}
      />
      <ConferenceList
        conference="West"
        series={westSeries}
        teams={teams}
        rounds={rounds}
        onSimSeries={onSimSeries}
      />
    </div>
  )
}

interface ConferenceListProps {
  conference: 'East' | 'West'
  series: PlayoffSeries[]
  teams: Record<string, Team>
  rounds: readonly (1 | 2 | 3)[]
  onSimSeries: (seriesId: string) => void
}

function ConferenceList({
  conference,
  series,
  teams,
  rounds,
  onSimSeries,
}: ConferenceListProps) {
  return (
    <div>
      <h3 className="text-lg font-display font-semibold mb-3">
        {conference} Conference
      </h3>
      <div className="space-y-4">
        {rounds.map((round) => {
          const roundSeries = series.filter((s) => s.round === round)
          if (roundSeries.length === 0) return null

          return (
            <div key={round}>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] mb-2">
                {getSeriesRoundLabel(round)}
              </div>
              <div className="space-y-2">
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
