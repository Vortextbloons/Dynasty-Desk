import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary)] mb-2">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-foreground)] leading-none">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
