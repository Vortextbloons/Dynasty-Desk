import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { players, teams } = useGlobalSearch(query)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSelect(type: 'player' | 'team', id: string) {
    setOpen(false)
    setQuery('')
    if (type === 'player') {
      void navigate(`/player/${id}`)
    } else {
      void navigate(`/roster?team=${id}`)
    }
  }

  const hasResults = players.length > 0 || teams.length > 0

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <div className="flex items-center gap-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2.5 h-9 w-72 text-sm text-[var(--color-muted-foreground)]">
        <Search className="size-4 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players, teams…"
          className="bg-transparent flex-1 outline-none placeholder:text-[var(--color-muted-foreground)]"
        />
        <span className="text-[10px] font-mono border border-[var(--color-line-soft)] rounded px-1.5 py-0.5 shrink-0">
          /
        </span>
      </div>

      {open && query && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-background)] shadow-lg z-50 max-h-96 overflow-y-auto">
          {players.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] border-b border-[var(--color-line-soft)]">
                Players
              </div>
              {players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect('player', p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-2)] transition-colors text-left"
                >
                  <PlayerHeadshot player={p} size={32} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.firstName} {p.lastName}
                    </div>
                    <div className="text-[10px] text-[var(--color-muted-foreground)]">
                      {p.position}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {teams.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] border-b border-[var(--color-line-soft)]">
                Teams
              </div>
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect('team', t.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-2)] transition-colors text-left"
                >
                  <div
                    className="size-8 rounded-md grid place-items-center font-display text-[10px] shrink-0"
                    style={{ backgroundColor: t.colors?.primary ?? '#1d428a', color: '#0b0d10' }}
                  >
                    {t.abbreviation}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {t.city} {t.name}
                    </div>
                    <div className="text-[10px] text-[var(--color-muted-foreground)]">
                      {t.abbreviation}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
