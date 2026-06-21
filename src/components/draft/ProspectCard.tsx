import type { DraftProspect } from '@/game/models/draft'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/shared/Chip'

interface ProspectCardProps {
  prospect: DraftProspect
  scoutingPoints?: number
  onSelect?: () => void
  onTwoWay?: () => void
  selected?: boolean
}

export function ProspectCard({ prospect, scoutingPoints, onSelect, onTwoWay, selected }: ProspectCardProps) {
  const ovr = prospect.visibleRatings.overall ?? '?'
  const [potLow, potHigh] = prospect.visiblePotentialRange

  return (
    <Card className={selected ? 'ring-2 ring-[var(--color-primary)]' : ''}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {prospect.externalId ? (
              <img
                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${prospect.externalId}.png`}
                alt={`${prospect.firstName} ${prospect.lastName}`}
                className="rounded-md object-cover"
                style={{ width: 48, height: 48 }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : null}
            <div>
              <div className="font-medium">
                {prospect.firstName} {prospect.lastName}
              </div>
              <div className="text-xs text-[var(--color-muted-foreground)]">
                {prospect.position} · {prospect.age}y · {prospect.archetype}
              </div>
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
        {(onSelect ?? onTwoWay) && (
          <div className="flex gap-2">
            {onSelect && (
              <Button size="sm" variant="secondary" className="flex-1" onClick={onSelect}>
                Select
              </Button>
            )}
            {onTwoWay && (
              <Button size="sm" variant="outline" className="flex-1" onClick={onTwoWay}>
                Two-way
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
