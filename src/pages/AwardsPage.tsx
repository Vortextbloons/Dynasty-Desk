import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function AwardsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="League"
        title="Awards"
        description="MVP, DPOY, ROY, Sixth Man, MIP, Coach of the Year, All-League and All-Defense teams."
      />
      <PlaceholderPage
        title="Award races"
        description="Live race for every major award, with historical winners and All-League team ballots."
        milestone="Milestone 10 — Realism Expansion"
        features={[
          'Current-year award race tracker',
          'Past winners and ballot history',
          'All-League / All-Defense / All-Rookie teams',
        ]}
      />
    </div>
  )
}
