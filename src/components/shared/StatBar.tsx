export function StatBar({
  label,
  value,
  max = 100,
  color,
}: {
  label: string
  value: number
  max?: number
  color?: string
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const barColor = color ?? 'var(--color-primary)'

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 text-xs text-[var(--color-muted-foreground)]">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="w-8 text-right font-mono text-sm">{value}</div>
    </div>
  )
}
