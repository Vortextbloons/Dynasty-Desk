import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppShell } from '@/components/layout/AppShell'

export function NewLeaguePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Start a dynasty"
        title="New League"
        description="Pick a real NBA franchise, choose a season length, and start your run. Save lives in your browser."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="size-4" /> Home</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto size-12 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] grid place-items-center">
            <Sparkles className="size-5" />
          </div>
          <div className="mt-4 font-display text-2xl">Wiring up in Milestone 2</div>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">
            Team selection, league rules, and snapshot choice land in the
            New League &amp; Save System milestone. For now, the rest of the
            app is navigable so you can see the shell.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild>
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/roster">Preview Roster Page</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
