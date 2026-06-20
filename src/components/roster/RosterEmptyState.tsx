import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface RosterEmptyStateProps {
  hasSave: boolean
}

export function RosterEmptyState({ hasSave }: RosterEmptyStateProps) {
  if (hasSave) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No players match these filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-10 text-center space-y-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Start a league to manage a roster.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link to="/new-league">New League</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/load-game">Load Game</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
