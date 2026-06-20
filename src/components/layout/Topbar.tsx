import { Bell, Search, Sun, Moon, Loader2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useGameStore } from '@/store/useGameStore'

function titleFor(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard'
  if (pathname.startsWith('/roster')) return 'Roster'
  if (pathname.startsWith('/lineup')) return 'Lineup & Rotation'
  if (pathname.startsWith('/schedule')) return 'Schedule'
  if (pathname.startsWith('/standings')) return 'Standings'
  if (pathname.startsWith('/trades')) return 'Trade Center'
  if (pathname.startsWith('/free-agency')) return 'Free Agency'
  if (pathname.startsWith('/draft')) return 'Draft'
  if (pathname.startsWith('/contracts')) return 'Contracts'
  if (pathname.startsWith('/news')) return 'League News'
  if (pathname.startsWith('/awards')) return 'Awards'
  if (pathname.startsWith('/settings')) return 'Settings'
  return 'Dynasty Desk'
}

function readInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('dd-theme') as 'dark' | 'light' | null
  const initial = stored ?? 'dark'
  document.documentElement.classList.toggle('dark', initial === 'dark')
  return initial
}

export function Topbar() {
  const location = useLocation()
  const [theme, setTheme] = useState<'dark' | 'light'>(readInitialTheme)
  const save = useGameStore((s) => s.save)
  const saveStatus = useGameStore((s) => s.saveStatus)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('dd-theme', next)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line-soft)] bg-[var(--color-background)]/75 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-5 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            Section
          </span>
          <span className="font-display text-base text-[var(--color-foreground)] truncate">
            {titleFor(location.pathname)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div className="hidden lg:flex items-center gap-2 mr-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2.5 h-9 w-72 text-sm text-[var(--color-muted-foreground)]">
            <Search className="size-4" />
            <input
              placeholder="Search players, teams, news…"
              className="bg-transparent flex-1 outline-none placeholder:text-[var(--color-muted-foreground)]"
            />
            <span className="text-[10px] font-mono border border-[var(--color-line-soft)] rounded px-1.5 py-0.5">
              /
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="size-9 grid place-items-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
          <button
            className="size-9 grid place-items-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] relative"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[var(--color-primary)]" />
          </button>
          <div className="ml-1 flex items-center gap-2 pl-2 border-l border-[var(--color-line-soft)] h-9">
            <div className="size-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-[var(--color-primary-foreground)] grid place-items-center font-display text-xs">
              {save ? save.user.managerName.charAt(0).toUpperCase() : 'GM'}
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-xs font-medium flex items-center gap-1.5">
                {save ? save.metadata.name : 'No active save'}
                {saveStatus === 'saving' && (
                  <Loader2 className="size-3 animate-spin text-[var(--color-primary)]" />
                )}
              </div>
              <div className="text-[10px] text-[var(--color-muted-foreground)]">
                {save
                  ? `${save.metadata.teamName} · ${save.metadata.snapshotId}`
                  : 'Start a new league'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
