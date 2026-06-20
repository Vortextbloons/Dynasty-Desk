import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DraftProspect } from '@/game/models/draft'
import { ProspectCard } from './ProspectCard'

interface MyPickPanelProps {
  pickNumber: number
  teamName: string
  prospects: DraftProspect[]
  scoutingAllocations: Record<string, number>
  onPick: (prospectId: string, isTwoWay: boolean) => void
  onAutoPick: () => void
}

export function MyPickPanel({
  pickNumber,
  teamName,
  prospects,
  scoutingAllocations,
  onPick,
  onAutoPick,
}: MyPickPanelProps) {
  return (
    <Card className="border-[var(--color-primary)]/30">
      <CardHeader>
        <CardTitle className="text-sm">
          Pick #{pickNumber} — {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onAutoPick}>
            Auto-pick
          </Button>
        </div>
        <div className="grid gap-2 max-h-80 overflow-y-auto">
          {prospects.slice(0, 12).map((p) => (
            <ProspectCard
              key={p.id}
              prospect={p}
              scoutingPoints={scoutingAllocations[p.id]}
              onSelect={() => onPick(p.id, false)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
