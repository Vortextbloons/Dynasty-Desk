import { useMemo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import { hydrateStaticPlayer } from '@/game/core/hydrateStaticPlayer'
import type { Player } from '@/game/models'

export function usePlayerById(id: string | null | undefined): Player | null {
  const save = useGameStore((s) => s.save)
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    defaultSeasonId,
  )

  return useMemo(() => {
    if (!id) return null

    if (save) {
      return save.league.players[id] ?? null
    }

    if (snapshot) {
      const sp = snapshot.players.find((p) => p.id === id)
      if (!sp) return null
      return hydrateStaticPlayer(sp, snapshot.seasonLabel, snapshot.seasonStats)
    }

    return null
  }, [id, save, snapshot])
}
