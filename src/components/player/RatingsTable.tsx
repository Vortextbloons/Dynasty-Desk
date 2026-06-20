import type { PlayerRatings } from '@/game/models'
import { StatBar } from '@/components/shared/StatBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RatingGroup {
  label: string
  ratings: { key: keyof PlayerRatings; label: string }[]
}

const GROUPS: RatingGroup[] = [
  {
    label: 'Scoring',
    ratings: [
      { key: 'insideScoring', label: 'INS' },
      { key: 'closeShot', label: 'CLS' },
      { key: 'midrange', label: 'MID' },
      { key: 'threePoint', label: '3PT' },
      { key: 'freeThrow', label: 'FT' },
    ],
  },
  {
    label: 'Playmaking',
    ratings: [
      { key: 'ballHandling', label: 'HNDL' },
      { key: 'passing', label: 'PASS' },
      { key: 'offensiveIq', label: 'OFF IQ' },
    ],
  },
  {
    label: 'Rebounding',
    ratings: [
      { key: 'offensiveRebound', label: 'OREB' },
      { key: 'defensiveRebound', label: 'DREB' },
    ],
  },
  {
    label: 'Defense',
    ratings: [
      { key: 'perimeterDefense', label: 'PER D' },
      { key: 'interiorDefense', label: 'INT D' },
      { key: 'steal', label: 'STL' },
      { key: 'block', label: 'BLK' },
      { key: 'defensiveIq', label: 'DEF IQ' },
    ],
  },
  {
    label: 'Athletic',
    ratings: [
      { key: 'speed', label: 'SPD' },
      { key: 'strength', label: 'STR' },
      { key: 'vertical', label: 'VERT' },
      { key: 'stamina', label: 'STA' },
      { key: 'durability', label: 'DUR' },
    ],
  },
  {
    label: 'Mental',
    ratings: [
      { key: 'clutch', label: 'CLTCH' },
      { key: 'consistency', label: 'CONS' },
      { key: 'potential', label: 'POT' },
    ],
  },
]

export function RatingsTable({ ratings }: { ratings: PlayerRatings }) {
  return (
    <div className="space-y-4">
      <Card className="border-[var(--color-primary)]/30 bg-[var(--color-surface-2)]">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm text-[var(--color-muted-foreground)]">
            Overall Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-4xl font-bold text-[var(--color-primary)]">
              {ratings.overall}
            </span>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              / 100
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <Card key={group.label}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm">
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.ratings.map((r) => (
                <StatBar
                  key={r.key}
                  label={r.label}
                  value={ratings[r.key]}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
