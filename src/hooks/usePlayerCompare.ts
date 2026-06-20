import { usePlayerById } from './usePlayerById'
import type { Player } from '@/game/models'

export interface PlayerCompareResult {
  left: Player | null
  right: Player | null
}

export function usePlayerCompare(
  leftId: string | null,
  rightId: string | null,
): PlayerCompareResult {
  const left = usePlayerById(leftId)
  const right = usePlayerById(rightId)

  return { left, right }
}
