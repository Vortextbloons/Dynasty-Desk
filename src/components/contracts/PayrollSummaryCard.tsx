import { Card, CardContent } from '@/components/ui/card'
import type { TeamFinances } from '@/game/models/team'
import type { LeagueRules } from '@/game/models/leagueRules'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface PayrollSummaryCardProps {
  finances: TeamFinances
  rules: LeagueRules
}

export function PayrollSummaryCard({ finances, rules }: PayrollSummaryCardProps) {
  const capPct = rules.salaryCap > 0
    ? Math.round((finances.payroll / rules.salaryCap) * 100)
    : 0

  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
          Payroll Summary
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Cap" value={fmt(rules.salaryCap)} />
          <Stat label="Apron" value={fmt(rules.apron)} />
          <Stat label="2nd Apron" value={fmt(rules.secondApron)} />
          <Stat label="Tax Line" value={fmt(rules.luxuryTaxLine)} />
          <Stat
            label="Payroll"
            value={fmt(finances.payroll)}
            sub={`${capPct}% of cap`}
          />
          <Stat
            label="Cap Space"
            value={fmt(finances.capSpace)}
            highlight={finances.capSpace < 0 ? 'negative' : 'positive'}
          />
          <Stat label="Tax Bill" value={fmt(finances.taxBill)} />
          <Stat label="Projected Tax" value={fmt(finances.projectedTaxBill)} />
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: 'positive' | 'negative'
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {label}
      </div>
      <div
        className={`font-display text-xl mt-1 ${
          highlight === 'positive'
            ? 'text-emerald-500'
            : highlight === 'negative'
              ? 'text-red-500'
              : ''
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  )
}
