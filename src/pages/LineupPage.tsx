import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function LineupPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Front Office"
        title="Lineup & Rotation"
        description="Set starters, bench order, target minutes, and closing lineup. The sim respects your rotation."
      />
      <PlaceholderPage
        title="Rotation builder"
        description="Drag-and-drop rotation with target-minute validation, ball-handler coverage checks, foul trouble adjustments, and auto-generate recommendations."
        milestone="Milestone 4 — Lineups & Rotations"
        features={[
          'Five-slot starter board',
          'Bench ordering + target minutes',
          'Auto-generate rotation suggestion',
          'Closing lineup editor',
          'Injury replacement order',
          'Rotation validation warnings',
        ]}
      />
    </div>
  )
}
