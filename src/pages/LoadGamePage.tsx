import { Link } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppShell } from '@/components/layout/AppShell'

export function LoadGamePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Continue your run"
        title="Load Game"
        description="Pick up a saved league, or import a save file from another device."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" /> Home
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto size-12 rounded-full bg-[var(--color-surface-3)] text-[var(--color-primary)] grid place-items-center">
            <FolderOpen className="size-5" />
          </div>
          <div className="mt-4 font-display text-2xl">No saves yet</div>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">
            Saves live in IndexedDB once the save system ships. You can also
            import a <code className="font-mono">.dynasty-desk-save.json</code>{' '}
            file.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" disabled>
              <Upload className="size-4" /> Import save
            </Button>
            <Button asChild>
              <Link to="/new-league">Start a new league</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
