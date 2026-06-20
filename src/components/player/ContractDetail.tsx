import type { Contract } from '@/game/models'
import { Chip } from '@/components/shared/Chip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function fmtMoney(value: number): string {
  const m = value / 1_000_000
  if (m >= 1) return `$${m.toFixed(1)}M`
  const k = value / 1_000
  if (k >= 1) return `$${k.toFixed(0)}K`
  return `$${value}`
}

function getStatus(contract: Contract): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' } {
  if (contract.yearsRemaining === 0) return { label: 'Expired', variant: 'danger' }
  if (contract.option !== 'none' && contract.optionYear === contract.yearsRemaining) {
    return { label: 'Option Year', variant: 'warning' }
  }
  if (contract.yearsRemaining <= 1) return { label: 'Expiring', variant: 'warning' }
  return { label: 'Active', variant: 'success' }
}

function optionLabel(contract: Contract): string | null {
  if (contract.option === 'none') return null
  const type = contract.option === 'team' ? 'Team' : 'Player'
  return `${type} Option${contract.optionYear ? ` (Yr ${contract.optionYear})` : ''}`
}

export function ContractDetail({ contract }: { contract: Contract }) {
  const status = getStatus(contract)
  const opt = optionLabel(contract)
  const years = Math.max(contract.salaryByYear.length, 1)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-sm">Contract Status</CardTitle>
            <div className="flex items-center gap-2">
              <Chip label={status.label} variant={status.variant} />
              {contract.noTradeClause && <Chip label="NTC" variant="info" />}
              {contract.poisonPill && <Chip label="Poison Pill" variant="danger" />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Years Remaining</div>
              <div className="font-mono text-2xl font-bold">{contract.yearsRemaining}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Current Salary</div>
              <div className="font-mono text-2xl font-bold">
                {fmtMoney(contract.salaryByYear[0] ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Guaranteed</div>
              <div className="font-mono text-2xl font-bold">
                {contract.guaranteed ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Year-by-Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line-soft)] text-left text-xs text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-4 font-medium">Year</th>
                  <th className="pb-2 pr-4 font-medium">Salary</th>
                  <th className="pb-2 pr-4 font-medium">Signing Bonus</th>
                  <th className="pb-2 pr-4 font-medium">Likely Bonus</th>
                  <th className="pb-2 pr-4 font-medium">Unlikely Bonus</th>
                  <th className="pb-2 font-medium">Guaranteed</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: years }, (_, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--color-line-soft)] last:border-0"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono">
                      {fmtMoney(contract.salaryByYear[i] ?? 0)}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {fmtMoney(contract.signingBonusByYear[i] ?? 0)}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {fmtMoney(contract.likelyBonusesByYear[i] ?? 0)}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {fmtMoney(contract.unlikelyBonusesByYear[i] ?? 0)}
                    </td>
                    <td className="py-2 font-mono">
                      {contract.guaranteedByYear[i] ? '✓' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {(opt !== null || contract.birdRights || contract.earlyBird || contract.tradeKickers.length > 0 || contract.deferredMoney.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opt && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-muted-foreground)]">Option:</span>
                <Chip label={opt} variant="warning" />
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {contract.birdRights && <Chip label="Bird Rights" variant="info" />}
              {contract.earlyBird && <Chip label="Early Bird" variant="info" />}
            </div>

            {contract.tradeKickers.length > 0 && (
              <div>
                <div className="text-xs text-[var(--color-muted-foreground)] mb-1">Trade Kickers</div>
                <div className="space-y-1">
                  {contract.tradeKickers.map((tk, i) => (
                    <div key={i} className="text-sm font-mono">
                      {fmtMoney(tk.amount)} — {tk.condition.replace(/_/g, ' ')} ({tk.threshold})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contract.deferredMoney.length > 0 && (
              <div>
                <div className="text-xs text-[var(--color-muted-foreground)] mb-1">Deferred Money</div>
                <div className="space-y-1">
                  {contract.deferredMoney.map((dm, i) => (
                    <div key={i} className="text-sm font-mono">
                      {fmtMoney(dm.amount)} — {dm.payDate}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
