import type { PlayerMorale, PlayerHealth, PlayerDevelopment } from './player'
import type { TeamStrategy } from './team'

export function emptyMorale(): PlayerMorale {
  return {
    level: 75,
    happiness: 75,
    roleSatisfaction: 75,
    teamSatisfaction: 75,
    tradeRequest: false,
    tradeRequestLevel: 0,
  }
}

export function emptyHealth(): PlayerHealth {
  return {
    status: 'healthy',
    injuryDescription: null,
    daysRemaining: 0,
    gamesRemaining: 0,
  }
}

export function emptyDevelopment(): PlayerDevelopment {
  return {
    lastTrainedAt: null,
    focusArea: null,
    recentForm: 50,
    ageAtPeak: 27,
    progressionCurve: 'normal',
    ratingsDelta: {},
    breakoutChance: 0.1,
    bustRisk: 0.1,
  }
}

export function defaultStrategy(): TeamStrategy {
  return {
    offense: {
      pace: 'balanced',
      shotProfile: 'balanced',
      primaryAction: 'pick_and_roll',
      usageDistribution: 'balanced',
      crashOffensiveGlass: 'medium',
    },
    defense: {
      pickAndRollCoverage: 'drop',
      helpDefense: 'balanced',
      pressure: 'medium',
      reboundingFocus: 'balanced',
      physicality: 'balanced',
    },
  }
}
