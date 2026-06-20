export interface PlayerTendencies {
  usageRate: number
  passRate: number
  shotRate: number
  driveRate: number
  postUpRate: number

  rimFrequency: number
  shortMidFrequency: number
  longMidFrequency: number
  cornerThreeFrequency: number
  aboveBreakThreeFrequency: number

  threePointRate: number
  freeThrowRate: number
  turnoverRate: number

  isolationRate: number
  pickAndRollBallHandlerRate: number
  pickAndRollRollManRate: number
  spotUpRate: number
  transitionRate: number
  cutRate: number

  foulRate: number
  stealAttemptRate: number
  blockAttemptRate: number
  crashOffensiveGlassRate: number
}

export function emptyTendencies(): PlayerTendencies {
  return {
    usageRate: 20,
    passRate: 15,
    shotRate: 25,
    driveRate: 10,
    postUpRate: 5,

    rimFrequency: 25,
    shortMidFrequency: 15,
    longMidFrequency: 10,
    cornerThreeFrequency: 5,
    aboveBreakThreeFrequency: 15,

    threePointRate: 30,
    freeThrowRate: 25,
    turnoverRate: 12,

    isolationRate: 10,
    pickAndRollBallHandlerRate: 20,
    pickAndRollRollManRate: 10,
    spotUpRate: 20,
    transitionRate: 15,
    cutRate: 10,

    foulRate: 2,
    stealAttemptRate: 5,
    blockAttemptRate: 5,
    crashOffensiveGlassRate: 10,
  }
}
