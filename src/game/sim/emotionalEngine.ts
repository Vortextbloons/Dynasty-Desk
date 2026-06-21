export const DESPERATION_CLOCK_MAX = 180
export const DESPERATION_DEFICIT_MIN = 10
export const COMEBACK_FATIGUE_DEFICIT = 15
export const COMEBACK_FATIGUE_MULTIPLIER = 1.2
export const TRAP_GAME_PENALTY = -0.01
export const LETDOWN_GAME_PENALTY = -0.01
export const EMOTIONAL_FATIGUE_RECOVERY_PER_DAY = 15
export const CLOSE_GAME_FATIGUE_GAIN = 5
export const OT_FATIGUE_GAIN = 10
export const RIVALRY_FATIGUE_GAIN = 8
export const PLAYOFF_FATIGUE_GAIN = 12

export interface EmotionalState {
  fatigue: number
}

export function createEmotionalState(): EmotionalState {
  return { fatigue: 0 }
}

export function isDesperationMode(
  period: number,
  numPeriods: number,
  clock: number,
  offenseScore: number,
  defenseScore: number,
): boolean {
  const deficit = defenseScore - offenseScore
  return (
    period >= numPeriods &&
    clock <= DESPERATION_CLOCK_MAX &&
    deficit >= DESPERATION_DEFICIT_MIN
  )
}

export interface ScheduleContext {
  lastGameMargin: number
  lastGameWasRivalry: boolean
  lastGameWasOvertime: boolean
  daysRest: number
  opponentWinPct: number
  upcomingOpponentStrength: number
}

export function trapGamePenalty(ctx: ScheduleContext): number {
  if (ctx.lastGameMargin >= 15 && ctx.opponentWinPct < 0.400) {
    return TRAP_GAME_PENALTY
  }
  return 0
}

export function letdownGamePenalty(ctx: ScheduleContext): number {
  if (ctx.lastGameWasRivalry || ctx.lastGameWasOvertime) {
    return LETDOWN_GAME_PENALTY
  }
  return 0
}

export function emotionalFatigueGain(ctx: {
  wasCloseGame: boolean
  wasOvertime: boolean
  wasRivalry: boolean
  isPlayoff: boolean
}): number {
  let gain = 0
  if (ctx.wasCloseGame) gain += CLOSE_GAME_FATIGUE_GAIN
  if (ctx.wasOvertime) gain += OT_FATIGUE_GAIN
  if (ctx.wasRivalry) gain += RIVALRY_FATIGUE_GAIN
  if (ctx.isPlayoff) gain += PLAYOFF_FATIGUE_GAIN
  return gain
}

export function recoverEmotionalFatigue(
  current: number,
  daysOff: number,
): number {
  const recovery = daysOff * EMOTIONAL_FATIGUE_RECOVERY_PER_DAY
  return Math.max(0, current - recovery)
}

export function desperationFatigueMultiplier(deficit: number): number {
  if (deficit >= COMEBACK_FATIGUE_DEFICIT) {
    return COMEBACK_FATIGUE_MULTIPLIER
  }
  return 1
}

export function desperationEffects(): {
  paceBonus: number
  threePARateBonus: number
  turnoverRiskBonus: number
  varianceBonus: number
} {
  return {
    paceBonus: 0.05,
    threePARateBonus: 0.10,
    turnoverRiskBonus: 0.02,
    varianceBonus: 0.03,
  }
}
