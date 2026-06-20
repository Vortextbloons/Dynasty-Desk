import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Repeat,
  Gavel,
  Trophy,
  FileSignature,
  Newspaper,
  Award,
  Settings as SettingsIcon,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, group: 'Season' },
  { to: '/standings', label: 'Standings', icon: BarChart3, group: 'Season' },
  { to: '/trades', label: 'Trades', icon: Repeat, group: 'Season' },
  { to: '/free-agency', label: 'Free Agency', icon: Gavel, group: 'Season' },
  { to: '/draft', label: 'Draft', icon: Trophy, group: 'Season' },
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

export function Sidebar() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  const groups: NavItem['group'][] = ['Front Office', 'Season', 'League']
  const grouped = groups.map((g) => ({
    group: g,
    items: navItems.filter((i) => i.group === g),
  }))

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-[var(--color-line-soft)] bg-[var(--color-surface-1)]/80 backdrop-blur">
      <div className="px-6 pt-6 pb-5 border-b border-[var(--color-line-soft)]">
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
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              {group}
            </div>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
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
            className="mt-3 inline-block text-[var(--color-primary)] hover:underline"
          >
            ← Back to home
          </NavLink>
        )}
      </div>
    </aside>
  )
}
