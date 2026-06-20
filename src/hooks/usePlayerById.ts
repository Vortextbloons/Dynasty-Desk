import { useMemo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
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
      return {
        id: sp.id,
        firstName: sp.firstName,
        lastName: sp.lastName,
        age: sp.age,
        position: sp.position,
        secondaryPositions: sp.secondaryPositions,
        heightInches: sp.heightInches,
        weightLbs: sp.weightLbs,
        teamId: sp.teamId,
        ratings: sp.ratings,
        tendencies: sp.tendencies,
        traits: sp.traits,
        contract: sp.contract,
        morale: { level: 75, happiness: 75, roleSatisfaction: 75, teamSatisfaction: 75, tradeRequest: false, tradeRequestLevel: 0 },
        health: { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0 },
        development: { lastTrainedAt: null, focusArea: null, recentForm: 50, ageAtPeak: 27, progressionCurve: 'normal', ratingsDelta: {}, breakoutChance: 0.1, bustRisk: 0.1 },
        seasonStats: { season: snapshot.seasonLabel, teamId: sp.teamId, gamesPlayed: 0, minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinus: 0 },
        careerStats: [],
        historicalSeasons: snapshot.seasonStats.filter((s) => s.playerId === sp.id),
      }
    }

    return null
  }, [id, save, snapshot])
}
