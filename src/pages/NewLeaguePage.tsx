import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppShell } from '@/components/layout/AppShell'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import { getEraConfig, getLeagueRules } from '@/game/models'
import { seasonOpeningNight } from '@/game/core/seasonCalendar'
import { cn } from '@/lib/utils'

const DIFFICULTIES = [
  {
    value: 'rookie',
    label: 'Rookie',
    body: 'Forgiving sim, generous development.',
  },
  {
    value: 'pro',
    label: 'Pro',
    body: 'Balanced — the recommended starting point.',
  },
  {
    value: 'all_star',
    label: 'All-Star',
    body: 'Sharper trade AI and player demands.',
  },
  {
    value: 'superstar',
    label: 'Superstar',
    body: 'League pushes back hard. Tough sim.',
  },
  {
    value: 'hall_of_fame',
    label: 'Hall of Fame',
    body: 'Brutal. For second and third dynasties.',
  },
] as const

export function NewLeaguePage() {
  const navigate = useNavigate()
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const [startSeason, setStartSeason] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [managerName, setManagerName] = useState('Coach')
  const [difficulty, setDifficulty] =
    useState<(typeof DIFFICULTIES)[number]['value']>('pro')
  const [injuries, setInjuries] = useState(true)
  const [fatigue, setFatigue] = useState(true)
  const [salaryCap, setSalaryCap] = useState(true)

  const effectiveSeasonId = startSeason ?? defaultSeasonId
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    effectiveSeasonId,
  )

  const snapshots = useMemo(() => {
    if (staticData.status !== 'ready') return []
    return staticData.manifest.snapshots
      .filter((s) => s.type === 'nba')
      .sort((a, b) => b.startYear - a.startYear)
  }, [staticData])

  const seasonLabel = snapshot?.seasonLabel ?? null
  const era = seasonLabel ? getEraConfig(seasonLabel) : null
  const rules = seasonLabel ? getLeagueRules(seasonLabel) : null
  const openingNight = seasonLabel ? seasonOpeningNight(seasonLabel) : null

  return (
    <AppShell>
      <PageHeader
        eyebrow="Start a dynasty"
        title="New League"
        description="Pick a real NBA franchise, choose a season to start in, and watch the league diverge from real history based on your decisions."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" /> Home
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Section
            title="Time machine"
            description="Pick the season to start in. Real opening-night rosters, real rules, real era."
          >
            {staticData.status === 'loading' ? (
              <div className="text-sm text-[var(--color-muted-foreground)]">
                Loading seasons…
              </div>
            ) : staticData.status === 'error' ? (
              <div className="text-sm text-destructive">{staticData.error}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {snapshots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStartSeason(s.id)}
                    className={cn(
                      'text-left rounded-md border px-3 py-2 transition-colors',
                      effectiveSeasonId === s.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
                        : 'border-[var(--color-line-soft)] hover:border-[var(--color-line-strong)]',
                    )}
                  >
                    <div className="font-mono text-xs text-[var(--color-muted-foreground)]">
                      {s.id}
                    </div>
                    <div className="font-display text-sm leading-tight mt-1">
                      {s.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Franchise"
            description="Pick the team you want to run. Other teams are managed by AI."
          >
            {snapshot ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {snapshot.teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTeamId(t.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                      teamId === t.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-line-soft)] hover:border-[var(--color-line-strong)]',
                    )}
                  >
                    <div
                      className="size-9 rounded-md grid place-items-center font-display text-xs"
                      style={{
                        backgroundColor: t.colors.primary,
                        color: '#0b0d10',
                      }}
                    >
                      {t.abbreviation}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-sm truncate">
                        {t.city} {t.name}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        {t.conference} · {t.division}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted-foreground)]">
                Pick a season to load teams.
              </div>
            )}
          </Section>

          <Section
            title="Manager"
            description="Your name shows up in the news ticker and GM avatar."
          >
            <input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full sm:w-72 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 h-10 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </Section>

          <Section
            title="Difficulty"
            description="Affects trade AI, free agent demands, and sim variance."
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    'text-left rounded-md border p-3 transition-colors',
                    difficulty === d.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-line-soft)] hover:border-[var(--color-line-strong)]',
                  )}
                >
                  <div className="font-display text-sm">{d.label}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    {d.body}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Rules" description="Optional realism toggles.">
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                active={injuries}
                onClick={() => setInjuries(!injuries)}
                label="Injuries"
              />
              <ToggleChip
                active={fatigue}
                onClick={() => setFatigue(!fatigue)}
                label="Fatigue"
              />
              <ToggleChip
                active={salaryCap}
                onClick={() => setSalaryCap(!salaryCap)}
                label="Salary cap"
              />
            </div>
          </Section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary)]">
                  Summary
                </div>
                <div className="font-display text-2xl mt-1">
                  {managerName}'s dynasty
                </div>
                <div className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  {effectiveSeasonId ?? 'Pick a season'} ·{' '}
                  {teamId
                    ? (snapshot?.teams.find((t) => t.id === teamId)?.name ??
                      teamId)
                    : 'No team yet'}
                </div>
              </div>

              {era && rules && openingNight ? (
                <div className="space-y-2 text-sm border-t border-[var(--color-line-soft)] pt-4">
                  <Row label="Opening night" value={openingNight} mono />
                  <Row
                    label="Games"
                    value={String(rules.regularSeasonGames)}
                    mono
                  />
                  <Row
                    label="Playoffs"
                    value={rules.hasPlayIn ? 'Top 8 + play-in' : 'Top 8'}
                  />
                  <Row
                    label="League pace"
                    value={`${era.pace.toFixed(1)} pos/48`}
                    mono
                  />
                  <Row
                    label="League TS%"
                    value={`${(era.leagueTsPct * 100).toFixed(1)}%`}
                    mono
                  />
                </div>
              ) : null}

              <div className="border-t border-[var(--color-line-soft)] pt-4">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!snapshot || !teamId || !effectiveSeasonId}
                  onClick={() => {
                    if (!snapshot || !teamId || !effectiveSeasonId) return
                    const params = new URLSearchParams({
                      season: effectiveSeasonId,
                      team: teamId,
                    })
                    void navigate(`/dashboard?${params.toString()}`)
                  }}
                >
                  <Sparkles className="size-4" /> Begin dynasty
                </Button>
                <div className="text-[11px] text-[var(--color-muted-foreground)] mt-2 text-center">
                  Save creation lands in Milestone 2. For now, this confirms the
                  snapshot loads end-to-end.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                <Clock className="size-3.5" /> Why a time machine?
              </div>
              <p className="text-[var(--color-foreground)] leading-relaxed">
                Start in 1995-96 with the 72-win Bulls on your roster, or
                2015-16 with the 73-win Warriors. Your decisions reshape the
                league from a real starting point. Era-aware ratings keep a 1995
                center and a 2025 center on a comparable scale.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div>
          <div className="font-display text-lg">{title}</div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-1">
            {description}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className={cn(mono && 'font-mono')}>{value}</span>
    </div>
  )
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
          : 'border-[var(--color-line-soft)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
      )}
    >
      {label}
    </button>
  )
}
