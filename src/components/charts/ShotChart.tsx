import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ShotZoneData {
  zone: string
  attempts: number
  makes: number
  pct: number
}

interface ShotChartProps {
  zones: ShotZoneData[]
  playerName: string
}

export function ShotChart({ zones, playerName }: ShotChartProps) {
  if (zones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-sm text-[var(--color-muted-foreground)]">
            No shot data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">{playerName} — Shot Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={zones}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
            <XAxis
              dataKey="zone"
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
            <Bar dataKey="attempts" fill="#3b82f6" name="Attempts" />
            <Bar dataKey="makes" fill="#22c55e" name="Makes" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
