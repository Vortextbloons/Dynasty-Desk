import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Player } from '@/game/models'
import { Chip } from '@/components/shared/Chip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
}

export function DevelopmentChart({ player }: { player: Player }) {
  const dev = player.development
  const deltas = Object.entries(dev.ratingsDelta)

  const curveVariant: 'success' | 'warning' | 'danger' | 'info' =
    dev.progressionCurve === 'early'
      ? 'success'
      : dev.progressionCurve === 'late'
        ? 'info'
        : dev.progressionCurve === 'veteran_decline'
          ? 'danger'
          : 'warning'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Player Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Age at Peak</div>
              <div className="font-mono text-xl font-bold">{dev.ageAtPeak}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Curve</div>
              <div className="mt-1">
                <Chip label={dev.progressionCurve.replace('_', ' ')} variant={curveVariant} />
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Breakout Chance</div>
              <div className="font-mono text-xl font-bold">{Math.round(dev.breakoutChance)}%</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Bust Risk</div>
              <div className="font-mono text-xl font-bold">{Math.round(dev.bustRisk)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Year-over-Year Changes</CardTitle>
        </CardHeader>
        <CardContent>
          {deltas.length > 0 ? (
            <div className="space-y-1.5">
              {deltas
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([key, delta]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {formatLabel(key)}
                    </span>
                    <span
                      className="font-mono text-sm font-medium"
                      style={{
                        color:
                          delta > 0
                            ? '#22c55e'
                            : delta < 0
                              ? '#ef4444'
                              : 'var(--color-muted-foreground)',
                      }}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              No year-over-year data yet
            </div>
          )}
        </CardContent>
      </Card>

      {deltas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm">Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={deltas.map(([key, value]) => ({
                  name: formatLabel(key),
                  delta: value,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid var(--color-line-soft)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="delta"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-primary)', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {deltas.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-sm text-[var(--color-muted-foreground)]">
              Development data will accumulate as the season progresses
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
