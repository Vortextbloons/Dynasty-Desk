import type { PlayerTendencies } from '@/game/models'

interface TendencyGroup {
  label: string
  tendencies: { key: keyof PlayerTendencies; label: string }[]
}

const GROUPS: TendencyGroup[] = [
  {
    label: 'Scoring',
    tendencies: [
      { key: 'usageRate', label: 'Usage' },
      { key: 'shotRate', label: 'Shot' },
      { key: 'threePointRate', label: '3PT Rate' },
      { key: 'freeThrowRate', label: 'FT Rate' },
    ],
  },
  {
    label: 'Shot Selection',
    tendencies: [
      { key: 'rimFrequency', label: 'Rim' },
      { key: 'shortMidFrequency', label: 'Short Mid' },
      { key: 'longMidFrequency', label: 'Long Mid' },
      { key: 'cornerThreeFrequency', label: 'Corner 3' },
      { key: 'aboveBreakThreeFrequency', label: 'Above Break 3' },
    ],
  },
  {
    label: 'Playmaking',
    tendencies: [
      { key: 'passRate', label: 'Pass' },
      { key: 'isolationRate', label: 'Isolation' },
      { key: 'pickAndRollBallHandlerRate', label: 'PnR Ball' },
      { key: 'pickAndRollRollManRate', label: 'PnR Roll' },
      { key: 'spotUpRate', label: 'Spot Up' },
      { key: 'transitionRate', label: 'Transition' },
      { key: 'cutRate', label: 'Cut' },
    ],
  },
  {
    label: 'Other',
    tendencies: [
      { key: 'driveRate', label: 'Drive' },
      { key: 'postUpRate', label: 'Post Up' },
      { key: 'turnoverRate', label: 'Turnover' },
      { key: 'foulRate', label: 'Foul' },
      { key: 'stealAttemptRate', label: 'Steal Att' },
      { key: 'blockAttemptRate', label: 'Block Att' },
      { key: 'crashOffensiveGlassRate', label: 'Off Glass' },
    ],
  },
]

function formatPct(value: number): string {
  return `${Math.round(value)}%`
}

function getBarColor(value: number): string {
  if (value >= 60) return 'var(--color-primary)'
  if (value >= 40) return 'var(--color-accent)'
  return 'var(--color-muted-foreground)'
}

export function TendenciesList({
  tendencies,
}: {
  tendencies: PlayerTendencies
}) {
  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            {group.label}
          </div>
          <div className="space-y-1.5">
            {group.tendencies.map((t) => {
              const value = tendencies[t.key]
              const pct = Math.min(100, Math.max(0, value))
              return (
                <div key={t.key} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-[var(--color-muted-foreground)]">
                    {t.label}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: getBarColor(value),
                      }}
                    />
                  </div>
                  <div className="w-10 text-right font-mono text-xs">
                    {formatPct(value)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
