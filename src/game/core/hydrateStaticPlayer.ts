import type { Player } from '@/game/models/player'
import type { StaticPlayer } from '@/game/models/static'
import type { PlayerSeasonStats } from '@/game/models/playerSeasonStats'
import { computeOverall } from '@/game/ratings/overallWeights'

const DEFAULT_MORALE: Player['morale'] = {
  level: 75,
  happiness: 75,
  roleSatisfaction: 75,
  teamSatisfaction: 75,
  tradeRequest: false,
  tradeRequestLevel: 0,
}

const DEFAULT_HEALTH: Player['health'] = {
  status: 'healthy',
  injuryDescription: null,
  daysRemaining: 0,
  gamesRemaining: 0,
}

const DEFAULT_DEVELOPMENT: Player['development'] = {
  lastTrainedAt: null,
  focusArea: null,
  recentForm: 50,
  ageAtPeak: 27,
  progressionCurve: 'normal',
  ratingsDelta: {},
  breakoutChance: 0.1,
  bustRisk: 0.1,
}

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
