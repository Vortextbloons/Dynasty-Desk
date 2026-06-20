import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePlayerCompare } from '@/hooks/usePlayerCompare'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import { useGameStore } from '@/store/useGameStore'
import { CompareView } from '@/components/player/CompareView'
import type { StaticTeam } from '@/game/models'

export function PlayerComparePage() {
  const [searchParams] = useSearchParams()
  const leftId = searchParams.get('left')
  const rightId = searchParams.get('right')
  const save = useGameStore((s) => s.save)
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    defaultSeasonId,
  )

  const { left, right } = usePlayerCompare(leftId, rightId)

  const getTeam = (teamId: string | null): StaticTeam | null => {
    if (!teamId) return null
    if (save) return (save.league.teams[teamId] as unknown as StaticTeam) ?? null
    if (snapshot) return snapshot.teams.find((t) => t.id === teamId) ?? null
    return null
  }

  if (!leftId || !rightId) {
    return (
      <PageHeader
        eyebrow="Compare"
        title="Select two players"
        description="Open a player profile and click Compare to start a side-by-side comparison."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/roster">
              <ArrowLeft className="size-4" /> Roster
            </Link>
          </Button>
        }
      />
    )
  }

  if (!left || !right) {
    return (
      <PageHeader
        eyebrow="Compare"
        title="Player not found"
        description="One or both players could not be found. Check the URLs and try again."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/roster">
              <ArrowLeft className="size-4" /> Roster
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Compare"
        title={`${left.firstName} ${left.lastName} vs ${right.firstName} ${right.lastName}`}
        description="Side-by-side comparison"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/roster">
              <ArrowLeft className="size-4" /> Roster
            </Link>
          </Button>
        }
      />

      <CompareView
        left={left}
        right={right}
        leftTeam={getTeam(left.teamId)}
        rightTeam={getTeam(right.teamId)}
      />
    </div>
  )
}
