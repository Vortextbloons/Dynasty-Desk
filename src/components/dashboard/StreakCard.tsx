import { Card, CardContent } from '@/components/ui/card'
import type { TeamStreak } from '@/game/league/teamStreak'

export function StreakCard({ streak }: { streak: TeamStreak }) {
  const active = streak.wins >= 3 || streak.losses >= 3
  const isHot = streak.wins >= 3

  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Current Streak
        </div>
        <div className="mt-2">
          {streak.wins > 0 && streak.losses === 0 ? (
            <div className={`font-display text-3xl ${active ? 'text-emerald-500' : ''}`}>
              W{streak.wins}
            </div>
          ) : streak.losses > 0 && streak.wins === 0 ? (
            <div className={`font-display text-3xl ${active ? 'text-red-500' : ''}`}>
              L{streak.losses}
            </div>
          ) : (
            <div className="font-display text-3xl text-[var(--color-muted-foreground)]">—</div>
          )}
          {active && (
            <div className={`mt-1 text-xs font-medium ${isHot ? 'text-emerald-500' : 'text-red-500'}`}>
              {isHot ? 'On fire' : 'Cold stretch'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
