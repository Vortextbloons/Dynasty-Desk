import { cn } from '@/lib/utils'

type ChipVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  default: 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)]',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  danger: 'border-red-500/30 bg-red-500/10 text-red-500',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-500',
}

export function Chip({
  label,
  variant = 'default',
  size = 'sm',
}: {
  label: string
  variant?: ChipVariant
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        VARIANT_CLASSES[variant],
      )}
    >
      {label}
    </span>
  )
}
