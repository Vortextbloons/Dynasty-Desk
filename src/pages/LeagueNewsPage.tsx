import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function LeagueNewsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="League"
        title="League News"
        description="The pulse of the league — results, trades, signings, injuries, and award races."
      />
      <PlaceholderPage
        title="News feed"
        description="Chronological feed of league events. Filter by team, type, and importance. Headlines drive storylines, storylines drive dynasty."
        milestone="Milestone 10 — Realism Expansion"
        features={[
          'Filter by team, event type, importance',
          'Tied to game results, trades, signings, milestones',
          'Storyline-aware generated headlines',
        ]}
      />
    </div>
  )
}
