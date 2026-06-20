import type { Player } from '@/game/models/player'
import type { StaticPlayer } from '@/game/models/static'
import type { PlayerSeasonStats } from '@/game/models/playerSeasonStats'
import { computeOverall } from '@/game/ratings/overallWeights'

import { emptyMorale, emptyHealth, emptyDevelopment } from '@/game/models/defaults'

const DEFAULT_MORALE = emptyMorale()
const DEFAULT_HEALTH = emptyHealth()
const DEFAULT_DEVELOPMENT = emptyDevelopment()

export function hydrateStaticPlayer(
  sp: StaticPlayer,
  seasonLabel: string,
  seasonStats: PlayerSeasonStats[],
): Player {
  const overall = sp.ratings.overall ?? computeOverall(sp.ratings, sp.position)

  return {
    id: sp.id,
    externalId: sp.externalId,
    firstName: sp.firstName,
    lastName: sp.lastName,
    age: sp.age,
    position: sp.position,
    secondaryPositions: sp.secondaryPositions,
    heightInches: sp.heightInches,
    weightLbs: sp.weightLbs,
    teamId: sp.teamId,
    ratings: { ...sp.ratings, overall },
    tendencies: sp.tendencies,
    traits: sp.traits,
    contract: sp.contract,
    morale: DEFAULT_MORALE,
    health: DEFAULT_HEALTH,
    development: DEFAULT_DEVELOPMENT,
    fatigue: 0,
    seasonStats: {
      season: seasonLabel,
      teamId: sp.teamId,
      gamesPlayed: 0,
      minutes: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      plusMinus: 0,
    },
    careerStats: [],
    historicalSeasons: seasonStats.filter((s) => s.playerId === sp.id),
  }
}
