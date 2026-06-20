import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function FreeAgencyPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Season"
        title="Free Agency"
        description="The open market. Make offers, see interest, run negotiations, sign players."
      />
      <PlaceholderPage
        title="Free agent board"
        description="Browse free agents, filter by position and asking price, submit multi-year offers, and watch interest level update over rounds."
        milestone="Milestone 9 — Offseason, Draft & Free Agency"
        features={[
          'Filter by position / rating / age / asking price',
          'Multi-year offer builder',
          'Interest meter that updates per round',
          'AI team offers in parallel',
        ]}
      />
    </div>
  )
}
