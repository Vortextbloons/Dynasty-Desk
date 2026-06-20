import type { LeagueRules } from '@/game/models/leagueRules'
import type { Team } from '@/game/models/team'
import { computeFullTaxBill } from '@/game/management/luxuryTaxEngine'
import { Card, CardContent } from '@/components/ui/card'

interface TaxBreakdownCardProps {
  team: Team
  rules: LeagueRules
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function TaxBreakdownCard({ team, rules }: TaxBreakdownCardProps) {
  const bill = computeFullTaxBill(
    team,
    rules,
    team.priorTaxpayerYears ?? 0,
    new Date().getFullYear(),
  )
  const status = !bill.isTaxpayer
    ? 'Non-taxpayer'
    : bill.isRepeater
    ? 'Repeater taxpayer'
    : 'Taxpayer'

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            Luxury tax
          </div>
          <div
            className={`text-[10px] uppercase tracking-[0.22em] ${
              !bill.isTaxpayer
                ? 'text-emerald-500'
                : bill.isRepeater
                ? 'text-red-500'
                : 'text-amber-500'
            }`}
          >
            {status}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Bracket tax
            </div>
            <div className="font-mono text-sm">{fmt(bill.bracketTax)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Apron penalty
            </div>
            <div className="font-mono text-sm">{fmt(bill.apronPenalty)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Total bill
            </div>
            <div className="font-mono text-sm font-bold">
              {fmt(bill.totalTaxBill)}
            </div>
          </div>
        </div>

        {bill.bracketDetail.length > 0 && (
          <div className="border-t border-[var(--color-line-soft)] pt-2 space-y-1">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Brackets
            </div>
            {bill.bracketDetail.map((b, i) => (
              <div
                key={i}
                className="flex justify-between text-[10px] font-mono"
              >
                <span>
                  ${(b.threshold / 1_000_000).toFixed(0)}M+ @ {b.rate.toFixed(2)}x
                </span>
                <span>{fmt(b.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {bill.triggersPickFreeze && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-500">
            Over 2nd apron — 1st-round picks 7 years out will be frozen on the next trade.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
