import type { Player } from '@/game/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function getGrade(overall: number): string {
  if (overall >= 90) return 'A+'
  if (overall >= 85) return 'A'
  if (overall >= 80) return 'A-'
  if (overall >= 75) return 'B+'
  if (overall >= 70) return 'B'
  if (overall >= 65) return 'B-'
  if (overall >= 60) return 'C+'
  if (overall >= 55) return 'C'
  if (overall >= 50) return 'C-'
  if (overall >= 45) return 'D+'
  if (overall >= 40) return 'D'
  return 'F'
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#22c55e'
  if (grade.startsWith('B')) return '#3b82f6'
  if (grade.startsWith('C')) return '#f59e0b'
  if (grade.startsWith('D')) return '#f97316'
  return '#ef4444'
}

export function TradeValueCard({ player }: { player: Player }) {
  const grade = getGrade(player.ratings.overall)
  const gradeColor = getGradeColor(grade)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">Trade Value</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div
          className="font-display text-6xl font-bold"
          style={{ color: gradeColor }}
        >
          {grade}
        </div>
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          Trade value calculation coming in M9. This is a placeholder grade based on overall rating.
        </p>
      </CardContent>
    </Card>
  )
}
