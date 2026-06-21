import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGameStore } from '@/store/useGameStore'
import { Card, CardContent } from '@/components/ui/card'
import { PhaseTimeline } from '@/components/offseason/PhaseTimeline'
import { getNextPhase, canAdvancePhase } from '@/game/league/offseasonEngine'
import type { LeaguePhase } from '@/game/models/league'
import type { NewsImportance, NewsType } from '@/game/models/news'
import { formatGameDate, formatNewsType, formatPhaseLabel } from '@/lib/format'

const OFFSEASON_PHASES: LeaguePhase[] = ['offseason', 'draft', 'free_agency', 'preseason']

const TYPE_OPTIONS: { value: NewsType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'player_injury', label: 'Injuries' },
  { value: 'hot_streak', label: 'Hot streaks' },
  { value: 'cold_streak', label: 'Cold streaks' },
  { value: 'award_race', label: 'Awards' },
  { value: 'player_morale', label: 'Morale' },
  { value: 'trade_completed', label: 'Trades' },
]

export function LeagueNewsPage() {
  const save = useGameStore((s) => s.save)
  const advancePhase = useGameStore((s) => s.advancePhase)
  const markNewsRead = useGameStore((s) => s.markNewsRead)
  const markAllNewsRead = useGameStore((s) => s.markAllNewsRead)
  const filterNews = useGameStore((s) => s.filterNews)
  const [advancing, setAdvancing] = useState(false)
  const [typeFilter, setTypeFilter] = useState<NewsType | ''>('')
  const [importance, setImportance] = useState<NewsImportance | ''>('')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const news = useMemo(() => {
    if (!save) return []
    return filterNews({
      type: typeFilter || undefined,
      importance: importance || undefined,
      unreadOnly,
    }).slice().reverse()
  }, [save, filterNews, typeFilter, importance, unreadOnly])

  if (!save) {
    return <div className="p-6 text-sm text-[var(--color-muted-foreground)]">No active save.</div>
  }

  const league = save.league
  const inOffseasonLoop = OFFSEASON_PHASES.includes(league.phase)
  const advanceGuard = canAdvancePhase(league)

  const handleAdvance = async () => {
    setAdvancing(true)
    try {
      const result = await advancePhase()
      if (result?.blocked) {
        toast.error(result.reason ?? 'Cannot advance phase.')
        return
      }
      if (result?.newPhase) {
        toast.success(`Advanced to ${formatPhaseLabel(result.newPhase)}`)
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
        description="Injuries, streaks, awards, trades, and league milestones."
        actions={
          <button
            type="button"
            onClick={() => markAllNewsRead()}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Mark all read
          </button>
        }
      />

      {inOffseasonLoop && getNextPhase(league.phase) && (
        <Card className="border-[var(--color-primary)]/20">
          <CardContent className="p-5 space-y-4">
            <div className="text-sm font-medium">Continue your dynasty</div>
            <PhaseTimeline
              currentPhase={league.phase}
              onAdvance={handleAdvance}
              advancing={advancing}
              canAdvance={advanceGuard.ok}
              blockReason={advanceGuard.ok ? undefined : advanceGuard.reason}
            />
            <Link to="/offseason" className="text-xs text-[var(--color-primary)] hover:underline">
              Offseason hub →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as NewsType | '')}
          className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={importance}
          onChange={(e) => setImportance(e.target.value as NewsImportance | '')}
          className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm"
        >
          <option value="">All importance</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          Unread only
        </label>
      </div>

      <div className="space-y-3">
        {news.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No news yet.</p>
        ) : (
          news.map((item) => (
            <Card
              key={item.id}
              className={item.read ? 'opacity-70' : ''}
              onClick={() => markNewsRead(item.id)}
            >
              <CardContent className="p-4 cursor-pointer">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {formatGameDate(item.date)} · {formatNewsType(item.type)}
                  {!item.read && (
                    <span className="ml-2 text-[var(--color-primary)]">• new</span>
                  )}
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
