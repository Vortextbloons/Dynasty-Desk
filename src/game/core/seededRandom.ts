import type { RngState } from '@/game/models'

export function createRngState(seed?: string): RngState {
  return {
    seed: seed ?? crypto.randomUUID(),
    position: 0,
  }
}

export function cloneRngState(state: RngState): RngState {
  return { ...state }
}

function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return hash
}

export function createSeededRandom(state: RngState): {
  next: () => number
  getState: () => RngState
} {
  const rng = mulberry32(hashString(state.seed))
  let position = state.position

  for (let i = 0; i < position; i++) {
    rng()
  }

  return {
    next() {
      position++
      return rng()
    },
    getState() {
      return { seed: state.seed, position }
    },
  }
}
