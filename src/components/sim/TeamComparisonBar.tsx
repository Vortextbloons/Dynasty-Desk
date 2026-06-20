import type { TeamGameStats } from '@/game/models'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  home: { team: { abbreviation: string; name: string; colors: { primary: string; secondary: string } } | null; stats: TeamGameStats | null }
  away: { team: { abbreviation: string; name: string; colors: { primary: string; secondary: string } } | null; stats: TeamGameStats | null }
}

function pct(made: number, attempted: number): string {
  if (attempted === 0) return '.000'
  return (made / attempted).toFixed(3).replace(/^0/, '')
}

function StatRow({ label, home, away }: { label: string; home: string; away: string }) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-1.5 text-xs">
      <div className="text-right font-mono text-[var(--color-foreground)]">{home}</div>
      <div className="text-center text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {label}
      </div>
      <div className="text-left font-mono text-[var(--color-foreground)]">{away}</div>
    </div>
  )
}

export function TeamComparisonBar({ home, away }: Props) {
  if (!home.stats || !away.stats) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-[var(--color-muted-foreground)]">
          No stats available.
        </CardContent>
      </Card>
    )
  }
  const h = home.stats
  const a = away.stats
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 grid grid-cols-3 items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-[var(--color-muted-foreground)]">
              {home.team?.abbreviation ?? '—'}
            </div>
            <div className="font-display text-2xl">{h.points}</div>
          </div>
          <div className="text-center text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            vs
          </div>
          <div className="text-left">
            <div className="text-xs text-[var(--color-muted-foreground)]">
              {away.team?.abbreviation ?? '—'}
            </div>
            <div className="font-display text-2xl">{a.points}</div>
          </div>
        </div>
        <div className="divide-y divide-[var(--color-line-soft)]">
          <StatRow label="FG" home={pct(h.fgm, h.fga)} away={pct(a.fgm, a.fga)} />
          <StatRow label="3PT" home={pct(h.tpm, h.tpa)} away={pct(a.tpm, a.tpa)} />
          <StatRow label="FT" home={pct(h.ftm, h.fta)} away={pct(a.ftm, a.fta)} />
          <StatRow label="REB" home={String(h.totalRebounds)} away={String(a.totalRebounds)} />
          <StatRow label="AST" home={String(h.assists)} away={String(a.assists)} />
          <StatRow label="STL" home={String(h.steals)} away={String(a.steals)} />
          <StatRow label="BLK" home={String(h.blocks)} away={String(a.blocks)} />
          <StatRow label="TOV" home={String(h.turnovers)} away={String(a.turnovers)} />
          <StatRow label="PF" home={String(h.fouls)} away={String(a.fouls)} />
        </div>
      </CardContent>
    </Card>
  )
}
