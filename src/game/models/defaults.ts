import type { PlayerMorale, PlayerHealth, PlayerDevelopment } from './player'
import type { TeamStrategy } from './team'
import { parseTrainingFocus } from './training'

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
    injuryHistory: [],
  }
}

export function emptyDevelopment(): PlayerDevelopment {
  return {
    lastTrainedAt: null,
    focusArea: null,
    trainingFocus: 'balanced',
    recentForm: 50,
    ageAtPeak: 27,
    progressionCurve: 'normal',
    ratingsDelta: {},
    breakoutChance: 0.1,
    bustRisk: 0.1,
  }
}

export function hydrateDevelopment(
  raw: Record<string, unknown>,
): PlayerDevelopment {
  const focus = parseTrainingFocus(
    raw.trainingFocus ?? raw.focusArea ?? 'balanced',
  )
  return {
    lastTrainedAt:
      typeof raw.lastTrainedAt === 'string' ? raw.lastTrainedAt : null,
    focusArea: typeof raw.focusArea === 'string' ? raw.focusArea : null,
    trainingFocus: focus,
    recentForm: typeof raw.recentForm === 'number' ? raw.recentForm : 50,
    ageAtPeak: typeof raw.ageAtPeak === 'number' ? raw.ageAtPeak : 27,
    progressionCurve:
      raw.progressionCurve === 'early' ||
      raw.progressionCurve === 'late' ||
      raw.progressionCurve === 'veteran_decline'
        ? raw.progressionCurve
        : 'normal',
    ratingsDelta:
      raw.ratingsDelta && typeof raw.ratingsDelta === 'object'
        ? (raw.ratingsDelta as Record<string, number>)
        : {},
    breakoutChance:
      typeof raw.breakoutChance === 'number' ? raw.breakoutChance : 0.1,
    bustRisk: typeof raw.bustRisk === 'number' ? raw.bustRisk : 0.1,
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
