import type { DraftProspect } from '@/game/models/draft'
import type { Player } from '@/game/models/player'
import type { RookieContract } from '@/game/models/rookieContract'
import { emptyTendencies } from '@/game/models/tendencies'
import { emptyTraits } from '@/game/models/traits'
import { createContract } from '@/game/models/contract'
import { emptyMorale, emptyHealth, emptyDevelopment } from '@/game/models/defaults'

export function prospectToPlayer(
  prospect: DraftProspect,
  teamId: string,
  rookieContract: RookieContract,
): Player {
  const id = `player-${prospect.id}`
  return {
    id,
    externalId: prospect.externalId,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    age: prospect.age,
    position: prospect.position,
    secondaryPositions: prospect.secondaryPositions,
    heightInches: prospect.heightInches,
    weightLbs: prospect.weightLbs,
    teamId,
    ratings: { ...prospect.trueRatings },
    tendencies: emptyTendencies(),
    traits: emptyTraits(),
    contract: createContract({
      salaryByYear: rookieContract.salaryByYear,
      yearsRemaining: rookieContract.yearsTotal,
      option: rookieContract.optionType === 'none' ? 'none' : rookieContract.optionType,
      optionYear: rookieContract.optionYear,
      guaranteed: true,
      guaranteedByYear: rookieContract.salaryByYear.map(
        (_, i) => i < rookieContract.yearsGuaranteed,
      ),
    }),
    morale: emptyMorale(),
    health: emptyHealth(),
    development: {
      ...emptyDevelopment(),
      bustRisk: prospect.bustRisk,
      breakoutChance: prospect.breakoutChance,
    },
    seasonStats: {
      season: '',
      teamId,
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
    historicalSeasons: [],
  }
}
