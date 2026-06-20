import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function SchedulePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Season"
        title="Schedule"
        description="Past and upcoming games. Sim next game, sim a day, sim a week, or sim straight to the playoffs."
      />
      <PlaceholderPage
        title="Schedule view"
        description="Calendar of past and upcoming games, with quick-sim controls and box-score shortcuts."
        milestone="Milestone 6 — Schedule & Standings"
        features={[
          'Sim next / day / week / to playoffs / season',
          'Game previews with lineups',
          'Jump to any past box score',
          'Highlight back-to-backs and road trips',
        ]}
      />
    </div>
  )
}
