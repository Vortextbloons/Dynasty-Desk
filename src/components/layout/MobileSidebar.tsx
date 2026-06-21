import { NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Gavel,
  Trophy,
  FileSignature,
  Newspaper,
  Award,
  Settings as SettingsIcon,
  Shield,
  Dumbbell,
  Target,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/useGameStore'
import { TradeNavItem } from '@/components/nav/TradeNavItem'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: 'Front Office' | 'Season' | 'League'
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Front Office',
  },
  { to: '/roster', label: 'Roster', icon: Users, group: 'Front Office' },
  {
    to: '/lineup',
    label: 'Lineup',
    icon: ClipboardList,
    group: 'Front Office',
  },
  { to: '/training', label: 'Training', icon: Dumbbell, group: 'Front Office' },
  { to: '/strategy', label: 'Strategy', icon: Target, group: 'Front Office' },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, group: 'Season' },
  { to: '/standings', label: 'Standings', icon: BarChart3, group: 'Season' },
  { to: '/playoffs', label: 'Playoffs', icon: Trophy, group: 'Season' },
  { to: '/offseason', label: 'Offseason', icon: Shield, group: 'Season' },
  { to: '/free-agency', label: 'Free Agency', icon: Gavel, group: 'Season' },
  { to: '/draft', label: 'Draft', icon: Trophy, group: 'Season' },
  { to: '/scouting', label: 'Scouting', icon: ClipboardList, group: 'Season' },
  {
    to: '/contracts',
    label: 'Contracts',
    icon: FileSignature,
    group: 'League',
  },
  { to: '/news', label: 'News', icon: Newspaper, group: 'League' },
  { to: '/awards', label: 'Awards', icon: Award, group: 'League' },
  { to: '/all-time', label: 'All-time', icon: Trophy, group: 'League' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, group: 'League' },
]

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const phase = useGameStore((s) => s.save?.league.phase) ?? 'regular_season'

  const groups: NavItem['group'][] = ['Front Office', 'Season', 'League']
  const grouped = groups.map((g) => ({
    group: g,
    items: navItems.filter((i) => i.group === g),
  }))

  useEffect(() => {
    onClose()
  }, [location.pathname, onClose])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-[var(--color-line-soft)] bg-[var(--color-surface-1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-200 outline-none"
          onEscapeKeyDown={onClose}
          onPointerDownOutside={onClose}
        >
          <div className="px-6 pt-6 pb-5 border-b border-[var(--color-line-soft)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] grid place-items-center font-display text-lg">
                DD
              </div>
              <div>
                <div className="font-display text-lg leading-none">
                  DYNASTY DESK
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] mt-1">
                  Front Office Sim
                </div>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                className="size-9 grid place-items-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  {group}
                </div>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    if (item.to === '/trades') {
                      return (
                        <TradeNavItem
                          key={item.to}
                          phase={phase}
                          label={item.label}
                        />
                      )
                    }
                    const Icon = item.icon
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-[var(--color-surface-3)] text-[var(--color-foreground)]'
                                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]',
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
                              <Icon className="size-4" />
                              <span className="flex-1">{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-[var(--color-line-soft)] p-4 text-[11px] text-[var(--color-muted-foreground)]">
            <div className="flex items-center gap-2">
              <Shield className="size-3.5" />
              <span>Local-only. No accounts. No tracking.</span>
            </div>
            {isHome ? null : (
              <NavLink
                to="/"
                onClick={onClose}
                className="mt-3 inline-block text-[var(--color-primary)] hover:underline"
              >
                ← Back to home
              </NavLink>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
