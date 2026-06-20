interface AIInterestMeterProps {
  delta: number | null
  legalityLegal: boolean
  rejectionReason?: string
  vetoReason?: string
  vetoingOwnerName?: string
}

function interestFromDelta(delta: number | null, legal: boolean): number {
  if (!legal) return 0
  if (delta === null) return 50
  const scaled = Math.max(0, Math.min(100, 50 - delta * 4))
  return Math.round(scaled)
}

export function AIInterestMeter({
  delta,
  legalityLegal,
  rejectionReason,
  vetoReason,
  vetoingOwnerName,
}: AIInterestMeterProps) {
  if (vetoReason) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-red-500 mb-1">
          Vetoed{vetoingOwnerName ? ` by ${vetoingOwnerName}` : ''}
        </div>
        <div className="text-sm text-red-500">{vetoReason}</div>
      </div>
    )
  }
  if (!legalityLegal && rejectionReason) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-500 mb-1">
          Illegal Trade
        </div>
        <div className="text-sm text-amber-500">{rejectionReason}</div>
      </div>
    )
  }

  const interest = interestFromDelta(delta, legalityLegal)
  const verdict =
    interest >= 70 ? 'Likely accept' :
    interest >= 40 ? 'Likely counter' :
    'Likely reject'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-muted-foreground)]">AI interest</span>
        <span className="font-mono text-[var(--color-foreground)]">{interest}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${interest}%`,
            background:
              interest >= 70 ? '#22c55e' :
              interest >= 40 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {verdict}
      </div>
    </div>
  )
}
