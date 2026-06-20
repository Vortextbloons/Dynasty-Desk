import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function DraftPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Season"
        title="Draft"
        description="Draft board, scouting reports, projected ranges, and a live draft-night interface."
      />
      <PlaceholderPage
        title="Draft board"
        description="Scouted prospects with hidden ratings, projected range, and bust/steal indicators. Allocate scouting points, then make your pick on the clock."
        milestone="Milestone 9 — Offseason, Draft & Free Agency"
        features={[
          'Scouting point allocation by player / position / region',
          'Live draft clock with auto-pick fallback',
          'Trade picks before and during the draft',
          'Mock draft and big board',
        ]}
      />
    </div>
  )
}
