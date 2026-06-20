import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'
import { useGameStore } from '@/store/useGameStore'

export function DashboardPage() {
  const save = useGameStore((s) => s.save)

  if (!save) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Front Office"
          title="Dashboard"
          description="Start a new league to see your team's dashboard."
        />
        <Card>
          <CardContent className="p-8 text-center">
            <div className="font-display text-2xl">No active save</div>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">
              Start a new league or load an existing save to view the dashboard.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link
                to="/new-league"
                className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 h-9 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
              >
                New League
              </Link>
              <Link
                to="/load-game"
                className="inline-flex items-center justify-center rounded-md border border-[var(--color-line-soft)] px-4 h-9 text-sm font-medium hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Load Game
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { league, metadata } = save
  const userTeam = league.teams[league.userTeamId]
  const standing = league.standings[league.userTeamId]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front Office"
        title="Dashboard"
        description={`${metadata.name} — ${league.currentDate}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Record
            </div>
            <div className="font-display text-3xl mt-2">
              {standing ? `${standing.wins} - ${standing.losses}` : '0 - 0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Conference
            </div>
            <div className="font-display text-3xl mt-2">
              {userTeam?.conference ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Phase
            </div>
            <div className="font-display text-3xl mt-2 capitalize">
              {league.phase.replace('_', ' ')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Season
            </div>
            <div className="font-display text-3xl mt-2">
              {metadata.snapshotId}
            </div>
          </CardContent>
        </Card>
      </div>

      <PlaceholderPage
        title="Dashboard is wired to a live league"
        description="Once the sim ships, this screen will surface standings snapshot, your next matchup, active injuries, morale alerts, and quick-sim controls."
        milestone="Milestone 6 — Schedule & Standings"
        features={[
          'Team record + recent form',
          'Next game preview with start time',
          'Active injuries and projected return',
          'Morale/chemistry alerts',
          'League news ticker',
          'Sim next / sim day / sim week controls',
        ]}
      />
    </div>
  )
}
