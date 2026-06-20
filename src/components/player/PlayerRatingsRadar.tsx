import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import type { Position, PlayerRatings } from '@/game/models'

const POSITION_RATINGS: Record<Position, (keyof PlayerRatings)[]> = {
  PG: ['ballHandling', 'passing', 'speed', 'threePoint', 'perimeterDefense', 'offensiveIq', 'defensiveIq', 'freeThrow'],
  SG: ['threePoint', 'midrange', 'perimeterDefense', 'speed', 'ballHandling', 'offensiveIq', 'steal', 'freeThrow'],
  SF: ['threePoint', 'midrange', 'perimeterDefense', 'defensiveIq', 'speed', 'insideScoring', 'offensiveRebound', 'defensiveRebound'],
  PF: ['insideScoring', 'defensiveRebound', 'interiorDefense', 'strength', 'midrange', 'threePoint', 'offensiveRebound', 'vertical'],
  C: ['insideScoring', 'defensiveRebound', 'interiorDefense', 'strength', 'offensiveRebound', 'block', 'closeShot', 'vertical'],
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
}

export function PlayerRatingsRadar({
  ratings,
  position,
}: {
  ratings: PlayerRatings
  position: Position
}) {
  const keys = POSITION_RATINGS[position]

  const data = keys.map((key) => ({
    rating: formatLabel(key),
    value: ratings[key],
  }))

  return (
    <div className="rounded-lg bg-[var(--color-surface-2)] p-4">
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--color-line-soft)" />
          <PolarAngleAxis
            dataKey="rating"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            stroke="var(--color-primary)"
            fill="var(--color-primary)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
