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

interface MinuteData {
  name: string
  minutes: number
  target: number
}

interface MinutesDistributionProps {
  players: MinuteData[]
  teamName: string
}

export function MinutesDistribution({ players, teamName }: MinutesDistributionProps) {
  if (players.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">{teamName} — Minutes Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={players}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
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
            <Bar dataKey="minutes" fill="var(--color-primary)" name="Minutes" />
            <Bar dataKey="target" fill="var(--color-muted-foreground)" name="Target" opacity={0.3} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
