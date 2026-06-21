import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AwardRaceEntry } from '@/game/models'
import { useGameStore } from '@/store/useGameStore'

interface AwardRaceChartProps {
  entries: AwardRaceEntry[]
  awardName: string
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6']

export function AwardRaceChart({ entries, awardName }: AwardRaceChartProps) {
  const players = useGameStore((s) => s.save?.league.players)

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-sm text-[var(--color-muted-foreground)]">
            No award race data
          </div>
        </CardContent>
      </Card>
    )
  }

  const top5 = entries.slice(0, 5).map((e) => {
    const player = players?.[e.playerId]
    return {
      name: player ? `${player.firstName} ${player.lastName}` : e.playerId,
      score: e.score,
    }
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">{awardName} Race</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={top5} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
            <XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-line-soft)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="score" name="Score">
              {top5.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
