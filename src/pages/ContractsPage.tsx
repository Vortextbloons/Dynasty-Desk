import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function ContractsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="League"
        title="Contracts"
        description="Payroll, cap space, expiring deals, and option flags. The ledger view of the front office."
      />
      <PlaceholderPage
        title="Payroll ledger"
        description="Year-by-year salary commitments, cap space, luxury tax projections, and upcoming free agents."
        milestone="Milestone 8 — Trades & Contracts"
        features={[
          'Multi-year salary breakdown by player',
          'Cap space and luxury tax projection',
          'Expiring contract timeline',
          'Team option / player option flags',
        ]}
      />
    </div>
  )
}
