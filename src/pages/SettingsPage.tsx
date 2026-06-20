import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="League"
        title="Settings"
        description="Difficulty, sim speed, auto-save, theme, and data management."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Difficulty" value="All-Pro" />
            <Row label="Sim speed" value="Balanced" />
            <Row label="Auto-save" value="On" />
            <Row label="Injuries" value="On" />
            <Row label="Fatigue" value="On" />
            <Row label="Salary cap" value="On" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Dynasty Desk is local-first. Your saves live in this browser only.
              Export a save to back it up or move it to another device.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">Export save</Button>
              <Button variant="outline">Import save</Button>
              <Button variant="destructive">Reset all data</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Dark mode is the default. Toggle light mode from the top bar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-muted-foreground)] space-y-2">
            <p>
              Dynasty Desk is a fan-made basketball front-office simulator. Not
              affiliated with or endorsed by the NBA. Real player and team names
              are used for identification and simulation purposes only.
            </p>
            <p>All gameplay data is static and ships in this bundle.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] last:border-b-0 pb-2 last:pb-0">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="font-mono text-[var(--color-foreground)]">{value}</span>
    </div>
  )
}
