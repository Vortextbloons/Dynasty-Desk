import { cn } from '@/lib/utils'

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
