import { NavLink } from 'react-router-dom'
import { Repeat, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaguePhase } from '@/game/models/league'

interface TradeNavItemProps {
  phase: LeaguePhase
  label: string
}

export function TradeNavItem({ phase, label }: TradeNavItemProps) {
  const locked = phase === 'playoffs' || phase === 'play_in'
  const baseClasses = cn(
    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
    locked
      ? 'text-[var(--color-muted-foreground)] opacity-50 cursor-not-allowed'
      : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]',
  )

  return (
    <li>
      {locked ? (
        <div
          className={baseClasses}
          title="Trade market closed — playoffs in progress"
          aria-disabled
        >
          <Lock className="size-4" />
          <span className="flex-1">{label}</span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-amber-500">
            Locked
          </span>
        </div>
      ) : (
        <NavLink
          to="/trades"
          className={({ isActive }) =>
            cn(
              baseClasses,
              isActive &&
                'bg-[var(--color-surface-3)] text-[var(--color-foreground)]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  isActive
                    ? 'bg-[var(--color-primary)]'
                    : 'bg-transparent group-hover:bg-[var(--color-line-strong)]',
                )}
              />
              <Repeat className="size-4" />
              <span className="flex-1">{label}</span>
            </>
          )}
        </NavLink>
      )}
    </li>
  )
}
