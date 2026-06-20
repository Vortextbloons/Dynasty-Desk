import { type ReactNode } from 'react'
import { Construction } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface PlaceholderPageProps {
  title: string
  description: string
  milestone: string
  features?: string[]
  children?: ReactNode
}

export function PlaceholderPage({
  title,
  description,
  milestone,
  features = [],
  children,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start gap-4 space-y-0">
          <div className="size-12 rounded-lg bg-[var(--color-surface-3)] grid place-items-center text-[var(--color-primary)]">
            <Construction className="size-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl font-display tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              {description}
            </CardDescription>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Targeted
            </div>
            <div className="text-sm font-mono text-[var(--color-foreground)]">
              {milestone}
            </div>
          </div>
        </CardHeader>
        {features.length > 0 ? (
          <CardContent>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-3">
              Planned scope
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-[var(--color-foreground)]"
                >
                  <span className="mt-1.5 size-1.5 rounded-full bg-[var(--color-primary)]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>
      {children}
    </div>
  )
}
