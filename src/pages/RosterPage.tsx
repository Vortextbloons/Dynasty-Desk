import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function RosterPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Front Office"
        title="Roster"
        description="Every player on your team — bios, ratings, tendencies, contracts, health, and morale. Sortable, filterable, deeply readable."
      />
      <PlaceholderPage
        title="Roster table"
        description="Real NBA player names with stat-derived ratings, separated tendencies, contract status, morale, and health. Built for fast scanning and deep dives."
        milestone="Milestone 3 — Roster & Player UI"
        features={[
          'Sort by rating, age, contract, OVR',
          'Filter by position, role, health, contract length',
          'Click row to open player profile',
          'Per-player trade value indicator',
          'CSV export of team roster',
        ]}
      />
    </div>
  )
}
