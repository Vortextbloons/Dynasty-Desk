interface SalaryMatchBarProps {
  outgoing: number
  incoming: number
  rule: string
  legal: boolean
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function SalaryMatchBar({
  outgoing,
  incoming,
  rule,
  legal,
}: SalaryMatchBarProps) {
  const max = Math.max(outgoing, incoming, 1)
  const outPct = (outgoing / max) * 100
  const inPct = (incoming / max) * 100
  const diff = incoming - outgoing
  const sign = diff >= 0 ? '+' : '−'

  return (
    <div
      className={`rounded-md border p-3 ${legal ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] mb-2">
        <span className="text-[var(--color-muted-foreground)]">Salary match</span>
        <span className={legal ? 'text-emerald-500' : 'text-red-500'}>
          {legal ? 'Legal' : 'Illegal'} • {rule}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-[var(--color-muted-foreground)] mb-1">Outgoing</div>
          <div className="h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${outPct}%` }}
            />
          </div>
          <div className="font-mono mt-1">{fmt(outgoing)}</div>
        </div>
        <div>
          <div className="text-[var(--color-muted-foreground)] mb-1">Incoming</div>
          <div className="h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
            <div
              className="h-full bg-sky-500"
              style={{ width: `${inPct}%` }}
            />
          </div>
          <div className="font-mono mt-1">{fmt(incoming)}</div>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-[var(--color-muted-foreground)]">
        Difference: <span className="font-mono text-[var(--color-foreground)]">{sign}{fmt(Math.abs(diff))}</span>
      </div>
    </div>
  )
}
