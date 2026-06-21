import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  variant?: 'table' | 'card' | 'chart' | 'page'
  rows?: number
  className?: string
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md bg-[var(--color-surface-2)] animate-pulse',
        className,
      )}
    />
  )
}

function TableSkeleton({ rows = 5 }: { rows: number }) {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function CardSkeleton({ rows = 4 }: { rows: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-6 space-y-4">
      <SkeletonBlock className="h-5 w-1/3" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-2/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3 w-full" />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-6 space-y-4">
      <SkeletonBlock className="h-5 w-1/4" />
      <SkeletonBlock className="h-64 w-full" />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-8 w-1/3" />
      <SkeletonBlock className="h-4 w-2/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 w-full rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)]" />
        ))}
      </div>
      <SkeletonBlock className="h-64 w-full rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)]" />
    </div>
  )
}

export function LoadingSkeleton({
  variant = 'card',
  rows = 5,
  className,
}: LoadingSkeletonProps) {
  return (
    <div className={cn(className)}>
      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'card' && <CardSkeleton rows={rows} />}
      {variant === 'chart' && <ChartSkeleton />}
      {variant === 'page' && <PageSkeleton />}
    </div>
  )
}
