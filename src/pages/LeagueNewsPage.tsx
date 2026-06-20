import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent } from '@/components/ui/card'
import { PhaseTimeline } from '@/components/offseason/PhaseTimeline'
import { getNextPhase } from '@/game/league/offseasonEngine'
import type { LeaguePhase } from '@/game/models/league'

const OFFSEASON_PHASES: LeaguePhase[] = ['offseason', 'draft', 'free_agency', 'preseason']

export function LeagueNewsPage() {
  const save = useGameStore((s) => s.save)
  const advancePhase = useGameStore((s) => s.advancePhase)
  const [advancing, setAdvancing] = useState(false)

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  const league = save.league
  const news = [...league.news].reverse().slice(0, 40)
  const inOffseasonLoop = OFFSEASON_PHASES.includes(league.phase)

  const handleAdvance = async () => {
    setAdvancing(true)
    try {
      const result = await advancePhase()
      if (result?.newPhase) {
        toast.success(`Advanced to ${result.newPhase.replace(/_/g, ' ')}`)
      }
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="League"
        title="League News"
        description="Results, trades, signings, and offseason milestones."
      />

      {inOffseasonLoop && getNextPhase(league.phase) && (
        <Card className="border-[var(--color-primary)]/20">
          <CardContent className="p-5 space-y-4">
            <div className="text-sm font-medium">Continue your dynasty</div>
            <PhaseTimeline
              currentPhase={league.phase}
              onAdvance={handleAdvance}
              advancing={advancing}
            />
            <Link to="/offseason" className="text-xs text-[var(--color-primary)] hover:underline">
              Offseason hub →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {news.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No news yet.</p>
        ) : (
          news.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {item.date} · {item.type.replace(/_/g, ' ')}
                </div>
                <div className="font-medium mt-1">{item.headline}</div>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{item.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
