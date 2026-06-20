import type { Player } from '@/game/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computePlayerValue } from '@/game/management/tradeValueModel'

function fmtNum(n: number): string {
  return n.toFixed(1)
}

export function TradeValueCard({ player }: { player: Player }) {
  const value = computePlayerValue(player, { direction: 'middle' } as never, {
    teamDirection: 'middle',
    positionNeed: { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 },
  })

  const salaryM = (player.contract.salaryByYear[0] ?? 0) / 1_000_000
  const overall = player.ratings.overall
  const potential = player.ratings.potential
  const ageFactor = (40 - player.age) * 0.5
  const potentialFactor = potential * 0.15

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">Trade Value</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        <div className="font-display text-6xl font-bold text-[var(--color-primary)]">
          {fmtNum(value)}
        </div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Trade value score
        </p>
        <div className="grid grid-cols-2 gap-2 text-left text-xs">
          <div className="rounded-md border border-[var(--color-line-soft)] p-2">
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Overall
            </div>
            <div className="font-mono">
              {fmtNum(overall * 0.5)} ({overall} OVR × 0.5)
            </div>
          </div>
          <div className="rounded-md border border-[var(--color-line-soft)] p-2">
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Potential
            </div>
            <div className="font-mono">
              {fmtNum(potentialFactor)} ({potential} POT × 0.15)
            </div>
          </div>
          <div className="rounded-md border border-[var(--color-line-soft)] p-2">
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Age
            </div>
            <div className="font-mono">
              {fmtNum(ageFactor)} ({(40 - player.age).toFixed(0)} × 0.5)
            </div>
          </div>
          <div className="rounded-md border border-[var(--color-line-soft)] p-2">
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Salary
            </div>
            <div className="font-mono text-red-500">
              −{fmtNum(salaryM * 0.4)} (${salaryM.toFixed(1)}M)
            </div>
          </div>
        </div>
        {player.contract.noTradeClause && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-500">
            NTC attached — cannot be traded.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
