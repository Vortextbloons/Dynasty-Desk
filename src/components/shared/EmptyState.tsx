import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title?: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'py-8 px-4 text-center space-y-2',
        className,
      )}
    >
      {Icon && (
        <Icon className="mx-auto size-8 text-[var(--color-muted-foreground)]/50" />
      )}
      {title && (
        <div className="text-sm font-medium text-[var(--color-foreground)]">{title}</div>
      )}
      <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
