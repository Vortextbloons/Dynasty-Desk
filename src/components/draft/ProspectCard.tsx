import type { DraftProspect } from '@/game/models/draft'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/shared/Chip'

interface ProspectCardProps {
  prospect: DraftProspect
  scoutingPoints?: number
  onSelect?: () => void
  selected?: boolean
}

export function ProspectCard({ prospect, scoutingPoints, onSelect, selected }: ProspectCardProps) {
  const ovr = prospect.visibleRatings.overall ?? '?'
  const [potLow, potHigh] = prospect.visiblePotentialRange

  return (
    <Card className={selected ? 'ring-2 ring-[var(--color-primary)]' : ''}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium">
              {prospect.firstName} {prospect.lastName}
            </div>
            <div className="text-xs text-[var(--color-muted-foreground)]">
              {prospect.position} · {prospect.age}y · {prospect.archetype}
            </div>
          </div>
          <Chip label={prospect.source === 'real' ? 'Real' : 'Synth'} variant="default" />
        </div>
        <div className="flex gap-3 text-xs">
          <span>OVR {ovr}</span>
          <span>POT {potLow}-{potHigh}</span>
          <span className="capitalize">Risk: {prospect.riskLevel}</span>
        </div>
        {scoutingPoints !== undefined && (
          <div className="text-[10px] text-[var(--color-muted-foreground)]">
            Scouted: {scoutingPoints}/100
          </div>
        )}
        {onSelect && (
          <Button size="sm" variant="secondary" className="w-full" onClick={onSelect}>
            Select
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
