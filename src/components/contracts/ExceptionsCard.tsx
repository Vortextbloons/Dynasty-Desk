import { Card, CardContent } from '@/components/ui/card'
import type { TeamExceptionBook } from '@/game/models/team'
import type { LeagueRules } from '@/game/models/leagueRules'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface ExceptionsCardProps {
  exceptions: TeamExceptionBook
  rules: LeagueRules
}

export function ExceptionsCard({ exceptions, rules }: ExceptionsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
          Available Exceptions
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ExceptionBadge
            name="MLE"
            amount={fmt(rules.midLevelException)}
            used={exceptions.mle}
          />
          <ExceptionBadge
            name="BAE"
            amount={fmt(rules.biAnnualException)}
            used={exceptions.bae}
          />
          <ExceptionBadge
            name="Room MLE"
            amount={fmt(rules.roomMle)}
            used={exceptions.roomMle}
          />
          <ExceptionBadge
            name="Vet Min"
            amount="Always"
            used={false}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ExceptionBadge({
  name,
  amount,
  used,
}: {
  name: string
  amount: string
  used: boolean
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        used
          ? 'border-[var(--color-line-soft)] bg-[var(--color-surface-2)] opacity-50'
          : 'border-emerald-500/30 bg-emerald-500/10'
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {name}
      </div>
      <div className="font-display text-sm mt-0.5">
        {used ? 'Used' : amount}
      </div>
    </div>
  )
}
