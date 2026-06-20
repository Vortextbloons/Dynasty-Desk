import { Card, CardContent } from '@/components/ui/card'
import type { OwnerProfile } from '@/game/models/owner'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const PERSONALITY_LABELS: Record<string, string> = {
  spendthrift: 'Spendthrift',
  patient: 'Patient',
  win_now: 'Win-Now',
  frugal: 'Frugal',
  meddler: 'Meddler',
  hands_off: 'Hands-Off',
}

interface OwnerCardProps {
  owner: OwnerProfile | undefined
  softCashWarning: boolean
}

export function OwnerCard({ owner, softCashWarning }: OwnerCardProps) {
  if (!owner) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            Owner
          </div>
          <div className="font-display text-xl mt-2 text-[var(--color-muted-foreground)]">
            No owner data
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Owner
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <div className="font-display text-xl">{owner.name}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            ({PERSONALITY_LABELS[owner.personality] ?? owner.personality})
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Cash
            </div>
            <div className="font-display text-lg">{fmt(owner.cash)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Patience
            </div>
            <div className="font-display text-lg">{owner.softCashPressureSeasons > 0 ? `${Math.max(0, 70 - owner.softCashPressureSeasons * 5)}` : '70'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Net Worth
            </div>
            <div className="font-display text-lg">{fmt(owner.netWorth)}</div>
          </div>
        </div>
        {softCashWarning && (
          <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Soft cash pressure active — ownerCash / totalExpenses below 50%.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
