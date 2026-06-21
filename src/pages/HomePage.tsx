import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  PlayCircle,
  FolderOpen,
  BookOpen,
  Database,
  Brain,
  Trophy,
  Activity,
  CircleDot,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

const features: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  accent: 'amber' | 'teal'
}[] = [
  {
    icon: Database,
    title: 'Real NBA rosters',
    body: 'Every franchise ships with stat-derived ratings and tendencies for ~450 NBA players.',
    accent: 'amber',
  },
  {
    icon: Brain,
    title: 'Possession sim',
    body: 'Layer 2 sim — every possession resolved through ratings, tendencies, fatigue, and matchups.',
    accent: 'teal',
  },
  {
    icon: Trophy,
    title: 'Full dynasty loop',
    body: 'Draft, develop, trade, sign, and shape the league across multiple seasons.',
    accent: 'amber',
  },
  {
    icon: Activity,
    title: 'Local-first',
    body: 'Static build, IndexedDB saves, exportable to JSON. No accounts, no tracking, no backend.',
    accent: 'teal',
  },
]

export function HomePage() {
  const saves = useGameStore((s) => s.saves)
  const loadSavesList = useGameStore((s) => s.loadSavesList)
  const hasSaves = saves.length > 0

  useEffect(() => {
    void loadSavesList()
  }, [loadSavesList])

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <TopNav />

      <main className="mx-auto max-w-7xl px-5 lg:px-8 pt-10 pb-20">
        <Hero hasSaves={hasSaves} />

        <section id="features" className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </section>

        <section id="loop" className="mt-20">
          <SectionHeader
            eyebrow="The loop"
            title="From the draft room to the championship podium"
            description="Build your roster, set the rotation, and let the sim run. The league diverges from real history based on your decisions."
          />
          <ol className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {loop.map((step, i) => (
              <li
                key={step.label}
                className="group relative rounded-xl border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-4 transition-all duration-300 hover:border-[var(--color-primary)]/30 hover:shadow-[0_0_20px_rgba(255,190,50,0.05)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="font-mono text-[10px] text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {i < loop.length - 1 && (
                    <ArrowRight className="size-3 text-[var(--color-line-strong)] hidden lg:block" />
                  )}
                </div>
                <div className="font-display text-base leading-tight">
                  {step.label}
                </div>
                <div className="mt-2 text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                  {step.body}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="roadmap" className="mt-20">
          <SectionHeader
            eyebrow="Roadmap"
            title="Built in public, milestone by milestone"
            description="Each milestone ships a complete, testable feature set. No stubs, no placeholder screens."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {milestones.map((m) => (
              <Card
                key={m.id}
                className={cn(
                  'transition-all duration-200',
                  m.status === 'in_progress' &&
                    'border-[var(--color-primary)]/50 shadow-[0_0_15px_rgba(255,190,50,0.08)]',
                  m.status === 'done' &&
                    'opacity-80 hover:opacity-100',
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                      {m.id}
                    </div>
                    <Badge status={m.status} />
                  </div>
                  <div className="mt-2 font-display text-base">{m.title}</div>
                  <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {m.summary}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </div>
  )
}

function TopNav() {
  return (
    <header className="border-b border-[var(--color-line-soft)]/60 backdrop-blur-sm sticky top-0 z-50 bg-[var(--color-background)]/80">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 h-14 flex items-center">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/70 text-[var(--color-primary-foreground)] grid place-items-center font-display text-sm shadow-[0_2px_8px_rgba(255,190,50,0.3)]">
            DD
          </div>
          <div className="font-display text-sm tracking-wide">DYNASTY DESK</div>
        </div>
        <nav className="ml-8 hidden md:flex items-center gap-5 text-sm text-[var(--color-muted-foreground)]">
          <a href="#features" className="hover:text-[var(--color-foreground)] transition-colors">
            Features
          </a>
          <a href="#loop" className="hover:text-[var(--color-foreground)] transition-colors">
            The loop
          </a>
          <a href="#roadmap" className="hover:text-[var(--color-foreground)] transition-colors">
            Roadmap
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://github.com"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            aria-label="GitHub"
          >
            <CircleDot className="size-3.5" /> v0.1.0
          </a>
        </div>
      </div>
    </header>
  )
}

function Hero({ hasSaves }: { hasSaves: boolean }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-positive)]/30 bg-[var(--color-positive)]/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-positive)]">
          <span className="size-1.5 rounded-full bg-[var(--color-positive)] animate-pulse" />
          M8 Complete · M9 Next
        </div>
        <h1 className="mt-5 font-display text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
          Run a franchise.
          <br />
          <span className="text-[var(--color-primary)]">Build a dynasty.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-[var(--color-muted-foreground)] leading-relaxed">
          Dynasty Desk is a local-first basketball front-office simulator built
          around real NBA rosters. Manage the rotation, sim the season, sign
          free agents, draft prospects, and reshape the league — all in your
          browser, all on your machine.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Button asChild size="lg" className="shadow-[0_2px_12px_rgba(255,190,50,0.25)] hover:shadow-[0_4px_20px_rgba(255,190,50,0.35)] transition-shadow">
            <Link to="/new-league">
              <PlayCircle className="size-4" /> New League
            </Link>
          </Button>
          {hasSaves ? (
            <Button asChild size="lg">
              <Link to="/load-game">
                <FolderOpen className="size-4" /> Continue
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="outline">
              <Link to="/load-game">
                <FolderOpen className="size-4" /> Load Game
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="ghost">
            <Link to="/dashboard">
              <BookOpen className="size-4" /> Open Dashboard
            </Link>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-muted-foreground)]">
          <Stat label="Teams" value="30" />
          <Divider />
          <Stat label="Players" value="~450" />
          <Divider />
          <Stat label="Default snapshot" value="NBA 2025-26" />
          <Divider />
          <Stat label="Storage" value="IndexedDB" />
        </div>
      </div>

      <ScoreboardMock />
    </div>
  )
}

function ScoreboardMock() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/20 blur-3xl"
      />
      <Card className="relative overflow-hidden border-[var(--color-line-soft)]/80">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface-1)] to-[var(--color-surface-2)]" />
        <div className="relative">
          <div className="px-5 py-3 border-b border-[var(--color-line-soft)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              <span className="size-1.5 rounded-full bg-[var(--color-positive)] animate-pulse" />
              Live sim · Q4 02:41
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Home
            </div>
          </div>
          <CardContent className="p-5 relative">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <TeamBlock abbr="LAL" name="Lakers" score={112} accent />
              <div className="font-mono text-sm text-[var(--color-muted-foreground)]">
                VS
              </div>
              <TeamBlock abbr="BOS" name="Celtics" score={108} align="right" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              {statRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border border-[var(--color-line-soft)] rounded-lg px-3 py-2.5 bg-[var(--color-surface-1)]/50"
                >
                  <span className="text-[var(--color-muted-foreground)] uppercase tracking-wider text-[10px]">
                    {row.label}
                  </span>
                  <span className="font-mono">
                    {row.left}
                    <span className="text-[var(--color-muted-foreground)] mx-1">
                      ·
                    </span>
                    {row.right}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 rounded-lg bg-[var(--color-surface-2)]/50 border border-[var(--color-line-soft)]/50">
              <div className="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
                <span className="text-[var(--color-primary)] font-mono mr-2">
                  04:12
                </span>
                Doncic P&amp;R with AD, kicks to Reaves in the corner — three is
                good.
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}

function TeamBlock({
  abbr,
  name,
  score,
  align = 'left',
  accent = false,
}: {
  abbr: string
  name: string
  score: number
  align?: 'left' | 'right'
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        align === 'right' && 'flex-row-reverse text-right',
      )}
    >
      <div
        className={cn(
          'size-12 rounded-lg grid place-items-center font-display text-sm border transition-all duration-300',
          accent
            ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)] shadow-[0_0_12px_rgba(255,190,50,0.15)]'
            : 'bg-[var(--color-surface-3)] border-[var(--color-line-soft)] text-[var(--color-foreground)]',
        )}
      >
        {abbr}
      </div>
      <div className="min-w-0">
        <div className="font-display text-3xl leading-none">{score}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] mt-1 truncate">
          {name}
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  accent,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  accent: 'amber' | 'teal'
  index: number
}) {
  return (
    <Card
      className="group transition-all duration-300 hover:border-[var(--color-primary)]/20 hover:shadow-[0_0_20px_rgba(255,190,50,0.04)]"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <CardContent className="p-5">
        <div
          className={cn(
            'size-9 rounded-lg grid place-items-center transition-colors duration-300',
            accent === 'amber'
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/15'
              : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] group-hover:bg-[var(--color-accent)]/15',
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="mt-4 font-display text-base">{title}</div>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          {body}
        </p>
      </CardContent>
    </Card>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary)]">
        {eyebrow}
      </div>
      <h2 className="mt-2 font-display text-3xl md:text-4xl tracking-tight leading-tight max-w-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-2xl">
        {description}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="font-mono text-[var(--color-foreground)]">{value}</span>
    </div>
  )
}

function Divider() {
  return <span className="size-1 rounded-full bg-[var(--color-line-strong)]" />
}

function Badge({ status }: { status: Milestone['status'] }) {
  const map = {
    done: {
      label: 'Done',
      cls: 'bg-[var(--color-positive)]/15 text-[var(--color-positive)] border-[var(--color-positive)]/30',
    },
    in_progress: {
      label: 'In Progress',
      cls: 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30',
    },
    next: {
      label: 'Next',
      cls: 'bg-[var(--color-surface-3)] text-[var(--color-muted-foreground)] border-[var(--color-line-soft)]',
    },
    later: {
      label: 'Later',
      cls: 'bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] border-[var(--color-line-soft)]',
    },
  } as const
  const m = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]',
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--color-line-soft)] pt-8 text-xs text-[var(--color-muted-foreground)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          © {new Date().getFullYear()} Dynasty Desk · Fan project. Not
          affiliated with the NBA. Real player and team names used for
          identification and simulation purposes only.
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="hover:text-[var(--color-foreground)] transition-colors">
            Features
          </a>
          <a href="#loop" className="hover:text-[var(--color-foreground)] transition-colors">
            The loop
          </a>
          <a href="#roadmap" className="hover:text-[var(--color-foreground)] transition-colors">
            Roadmap
          </a>
        </div>
      </div>
    </footer>
  )
}

interface Milestone {
  id: string
  title: string
  summary: string
  status: 'done' | 'in_progress' | 'next' | 'later'
}

const milestones: Milestone[] = [
  {
    id: 'M0',
    title: 'App shell',
    summary: 'Vite + React + Tailwind + routing + dark theme.',
    status: 'done',
  },
  {
    id: 'M1',
    title: 'Real NBA data',
    summary: 'Static snapshot, ~450 players, 30 teams.',
    status: 'done',
  },
  {
    id: 'M2',
    title: 'Saves & persistence',
    summary: 'Dexie storage, export/import JSON, auto-save.',
    status: 'done',
  },
  {
    id: 'M3',
    title: 'Money & finance',
    summary: 'Contracts, cap engine, revenue, owner system.',
    status: 'done',
  },
  {
    id: 'M4',
    title: 'Roster & player UI',
    summary: 'Sortable roster, player profiles, compare, search.',
    status: 'done',
  },
  {
    id: 'M5',
    title: 'Lineups & rotation',
    summary: 'Starters, bench, target minutes, closing lineup.',
    status: 'done',
  },
  {
    id: 'M6',
    title: 'Single-game sim',
    summary: 'Possession engine, shot/turnover/foul/rebound models.',
    status: 'done',
  },
  {
    id: 'M7',
    title: 'Schedule & standings',
    summary: 'Season sim end-to-end with dashboard updates.',
    status: 'done',
  },
  {
    id: 'M8',
    title: 'Playoffs',
    summary: 'Bracket, best-of-7 series, champion history.',
    status: 'done',
  },
  {
    id: 'M9',
    title: 'Trades & contracts',
    summary: 'Trade builder, AI accept/reject, payroll ledger.',
    status: 'in_progress',
  },
  {
    id: 'M10',
    title: 'Draft & free agency',
    summary: 'Prospects, scouting, multi-year offers.',
    status: 'next',
  },
  {
    id: 'M11',
    title: 'Realism expansion',
    summary: 'Injuries, fatigue, morale, awards, news.',
    status: 'later',
  },
  {
    id: 'M12',
    title: 'Polish & calibration',
    summary: 'Tune sim distributions, charts, accessibility.',
    status: 'later',
  },
]

const loop = [
  { label: 'Pick a franchise', body: 'Choose one of 30 NBA teams.' },
  { label: 'Set your rotation', body: 'Starters, bench, target minutes.' },
  { label: 'Sim the game', body: 'Possession-level engine resolves it.' },
  { label: 'Read the box', body: 'Plausible lines, stars get usage.' },
  { label: 'Run the season', body: 'Standings, streaks, playoff race.' },
  { label: 'Reshape the league', body: 'Trade, sign, draft — repeat.' },
]

const statRows = [
  { label: 'FG', left: '42/86', right: '39/88' },
  { label: '3PT', left: '14/34', right: '12/31' },
  { label: 'REB', left: '44', right: '39' },
  { label: 'TO', left: '11', right: '14' },
]
