import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front Office"
        title="Dashboard"
        description="Your daily briefing. Record, next game, injuries, morale, and league pulse — all in one place once a league is started."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Record', value: '— —' },
          { label: 'Conference rank', value: '—' },
          { label: 'Next game', value: 'TBD' },
          { label: 'Streak', value: '—' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                {s.label}
              </div>
              <div className="font-display text-3xl mt-2">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlaceholderPage
        title="Dashboard is wired to a live league"
        description="Once you start a new league, this screen will surface standings snapshot, your next matchup, active injuries, morale alerts, and quick-sim controls."
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

      <Card>
        <CardHeader>
          <CardTitle>Quick sim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm text-[var(--color-muted-foreground)]">
            <span className="px-3 py-1.5 rounded-md border border-[var(--color-line-soft)]">Sim next game</span>
            <span className="px-3 py-1.5 rounded-md border border-[var(--color-line-soft)]">Sim day</span>
            <span className="px-3 py-1.5 rounded-md border border-[var(--color-line-soft)]">Sim week</span>
            <span className="px-3 py-1.5 rounded-md border border-[var(--color-line-soft)]">Sim to playoffs</span>
            <span className="px-3 py-1.5 rounded-md border border-[var(--color-line-soft)]">Sim season</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
