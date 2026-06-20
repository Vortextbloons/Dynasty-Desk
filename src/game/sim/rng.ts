import {
  createSeededRandom,
} from '@/game/core/seededRandom'
import type { RngState } from '@/game/models'

export class SeededRandom {
  private readonly inner: { next: () => number; getState: () => RngState }
  private currentState: RngState

  constructor(state: RngState) {
    this.inner = createSeededRandom(state)
    this.currentState = this.inner.getState()
  }

  next(): number {
    const v = this.inner.next()
    this.currentState = this.inner.getState()
    return v
  }

  nextInt(min: number, max: number): number {
    if (max < min) {
      throw new Error(`nextInt: max (${max}) < min (${min})`)
    }
    if (max === min) return min
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  nextFloat(min: number, max: number): number {
    if (max < min) {
      throw new Error(`nextFloat: max (${max}) < min (${min})`)
    }
    return this.next() * (max - min) + min
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('pick: cannot pick from empty array')
    }
    const idx = this.nextInt(0, items.length - 1)
    return items[idx] as T
  }

  weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0) {
      throw new Error('weightedPick: cannot pick from empty array')
    }
    if (items.length !== weights.length) {
      throw new Error(
        `weightedPick: items (${items.length}) and weights (${weights.length}) length mismatch`,
      )
    }
    let total = 0
    for (const w of weights) {
      total += Math.max(0, w)
    }
    if (total <= 0) {
      return this.pick(items)
    }
    let roll = this.next() * total
    for (let i = 0; i < items.length; i++) {
      const w = Math.max(0, weights[i] ?? 0)
      if (roll < w) return items[i] as T
      roll -= w
    }
    return items[items.length - 1] as T
  }

  chance(probability: number): boolean {
    if (probability <= 0) return false
    if (probability >= 1) return true
    return this.next() < probability
  }

  get position(): number {
    return this.currentState.position
  }

  get state(): RngState {
    return { seed: this.currentState.seed, position: this.currentState.position }
  }
}
