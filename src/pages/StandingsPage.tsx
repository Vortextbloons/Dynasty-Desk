import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function StandingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Season"
        title="Standings"
        description="Conference and league standings with playoff picture, streaks, and point differential."
      />
      <PlaceholderPage
        title="Standings board"
        description="Live W/L, conference record, point differential, streak, last 10, and playoff bracket projections."
        milestone="Milestone 6 — Schedule & Standings"
        features={[
          'East / West conference split',
          'Streaks and last 10',
          'Playoff bracket picture',
          'Magic numbers and tiebreakers',
        ]}
      />
    </div>
  )
}
