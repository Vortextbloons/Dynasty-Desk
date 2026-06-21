export const MOMENTUM_HIGH = 65
export const MOMENTUM_LOW = 35
export const MOMENTUM_START = 50
export const MOMENTUM_DECAY_PER_SECOND = 2 / 60

export interface MomentumState {
  momentum: [number, number]
  runCounter: [{ points: number; since: number }, { points: number; since: number }]
}

export function createMomentumState(): MomentumState {
  return {
    momentum: [MOMENTUM_START, MOMENTUM_START],
    runCounter: [
      { points: 0, since: 0 },
      { points: 0, since: 0 },
    ],
  }
}

export function momentumGain(eventType: string): number {
  switch (eventType) {
    case 'made_3': return 5
    case 'and1': return 8
    case 'block': return 4
    case 'steal': return 6
    case 'dunk': return 7
    case 'oreb': return 3
    case 'tov_opponent': return 3
    case 'miss_opponent': return 2
    case 'technical_opponent': return 10
    case 'flagrant_opponent': return 15
    default: return 0
  }
}

export function decayMomentum(state: MomentumState, elapsedSeconds: number): void {
  const decay = MOMENTUM_DECAY_PER_SECOND * elapsedSeconds
  for (const t of [0, 1] as const) {
    const current = state.momentum[t]
    if (current > MOMENTUM_START) {
      state.momentum[t] = Math.max(MOMENTUM_START, current - decay)
    } else if (current < MOMENTUM_START) {
      state.momentum[t] = Math.min(MOMENTUM_START, current + decay)
    }
  }
}

export function applyMomentum(
  state: MomentumState,
  teamIdx: 0 | 1,
  eventType: string,
  isHome: boolean,
): void {
  const gain = momentumGain(eventType)
  if (gain === 0) return

  const adjustedGain = isHome ? gain * 1.2 : gain
  const loss = isHome ? gain * 0.8 : gain

  state.momentum[teamIdx] = Math.min(100, (state.momentum[teamIdx] ?? MOMENTUM_START) + adjustedGain)
  const oppIdx = teamIdx === 0 ? 1 : 0
  state.momentum[oppIdx] = Math.max(0, (state.momentum[oppIdx] ?? MOMENTUM_START) - loss)
}

export function checkForRun(state: MomentumState, teamIdx: 0 | 1, clock: number): void {
  const run = state.runCounter[teamIdx]
  if (run && run.points >= 8) {
    state.momentum[teamIdx] = Math.min(100, (state.momentum[teamIdx] ?? MOMENTUM_START) + 5)
    const oppIdx = teamIdx === 0 ? 1 : 0
    state.momentum[oppIdx] = Math.max(0, (state.momentum[oppIdx] ?? MOMENTUM_START) - 3)
    state.runCounter[teamIdx] = { points: 0, since: clock }
  }
}

export function addRunPoints(state: MomentumState, teamIdx: 0 | 1, points: number, clock: number): void {
  const run = state.runCounter[teamIdx]
  if (clock > run.since + 60) {
    state.runCounter[teamIdx] = { points, since: clock }
  } else {
    state.runCounter[teamIdx] = { points: run.points + points, since: run.since }
  }
}

export interface MomentumEffects {
  shot: number
  tov: number
  ft: number
}

export function momentumModifier(momentum: number): MomentumEffects {
  if (momentum > MOMENTUM_HIGH) {
    const boost = (momentum - 50) / 500
    return { shot: boost, tov: -boost / 2, ft: boost / 2 }
  }
  if (momentum < MOMENTUM_LOW) {
    const penalty = (50 - momentum) / 500
    return { shot: -penalty, tov: penalty / 2, ft: -penalty / 2 }
  }
  return { shot: 0, tov: 0, ft: 0 }
}
