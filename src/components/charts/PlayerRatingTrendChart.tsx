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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { perGame } from '@/game/models/playerSeasonStats'

export function PlayerRatingTrendChart({ player }: { player: Player }) {
  const data = player.historicalSeasons.map((hs) => {
    const pg = perGame(hs)
    return {
      season: hs.season,
      ppg: Math.round(pg.ppg * 10) / 10,
      rpg: Math.round(pg.rpg * 10) / 10,
      apg: Math.round(pg.apg * 10) / 10,
      tsPct: Math.round(hs.tsPct * 1000) / 10,
    }
  })

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-sm text-[var(--color-muted-foreground)]">
            No historical data yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
            <XAxis dataKey="season" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-line-soft)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="ppg" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} name="PPG" />
            <Line type="monotone" dataKey="rpg" stroke="#3b82f6" strokeWidth={1} dot={{ r: 2 }} name="RPG" />
            <Line type="monotone" dataKey="apg" stroke="#22c55e" strokeWidth={1} dot={{ r: 2 }} name="APG" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
