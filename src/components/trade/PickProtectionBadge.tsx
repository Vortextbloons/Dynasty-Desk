interface PickProtectionBadgeProps {
  protection?: string
  stepienBlocked?: boolean
  frozenUntilSeason?: string
  pickLabel?: string
}

export function PickProtectionBadge({
  protection,
  stepienBlocked,
  frozenUntilSeason,
  pickLabel,
}: PickProtectionBadgeProps) {
  const hasProtection = Boolean(protection)
  const hasFreeze = Boolean(frozenUntilSeason)
  const hasStepien = Boolean(stepienBlocked)

  if (!hasProtection && !hasFreeze && !hasStepien) {
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--color-line-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
        {pickLabel ?? 'Pick'}
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-1">
      {hasProtection && (
        <span
          className="inline-flex items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-500"
          title={`Top-${protection} protected`}
        >
          {pickLabel ?? 'Pick'} • top-{protection}
        </span>
      )}
      {hasFreeze && (
        <span
          className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500"
          title={`Frozen through ${frozenUntilSeason}`}
        >
          FROZEN
        </span>
      )}
      {hasStepien && (
        <span
          className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500"
          title="Stepien-blocked"
        >
          STEPIEN
        </span>
      )}
    </div>
  )
}
