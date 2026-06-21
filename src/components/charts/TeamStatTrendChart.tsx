import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SeasonTrendPoint } from '@/lib/seasonTrend'

interface TeamTrendProps {
  seasonResults: SeasonTrendPoint[]
  teamName: string
}

export function TeamStatTrendChart({ seasonResults, teamName }: TeamTrendProps) {
  if (seasonResults.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">{teamName} — Season Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={seasonResults}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
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
            <Legend />
            <Line type="monotone" dataKey="wins" stroke="#22c55e" strokeWidth={2} name="Wins" />
            <Line type="monotone" dataKey="losses" stroke="#ef4444" strokeWidth={2} name="Losses" />
            <Line type="monotone" dataKey="ppg" stroke="#3b82f6" strokeWidth={1} name="PPG" yAxisId={0} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
