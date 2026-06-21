// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  assignToBench,
  assignToStarter,
  balanceRotationMinutes,
  computeRotationMinutesTotal,
  getAvailablePlayerIds,
  moveBetweenSections,
  removeFromRotation,
  TOTAL_ROTATION_MINUTES,
  uniquePlayerIds,
} from '@/game/management/rotationActions'
import type { LineupSettings } from '@/game/models/team'

function makeLineup(overrides: Partial<LineupSettings> = {}): LineupSettings {
  return {
    starters: [],
    bench: [],
    closingLineup: [],
    targetMinutes: {},
    autoRotation: false,
    ...overrides,
  }
}

describe('rotationActions', () => {
  it('getAvailablePlayerIds excludes rotation players', () => {
    const lineup = makeLineup({ starters: ['p1'], bench: ['p2'] })
    expect(getAvailablePlayerIds(['p1', 'p2', 'p3', 'p4'], lineup)).toEqual([
      'p3',
      'p4',
    ])
  })

  it('assignToStarter adds player and default minutes', () => {
    const lineup = assignToStarter(makeLineup(), 'p1')
    expect(lineup.starters).toEqual(['p1'])
    expect(lineup.targetMinutes.p1).toBe(32)
  })

  it('assignToStarter replaces at slot index', () => {
    const lineup = assignToStarter(
      makeLineup({ starters: ['p1', 'p2'], targetMinutes: { p1: 30, p2: 28 } }),
      'p3',
      0,
    )
    expect(lineup.starters[0]).toBe('p3')
    expect(lineup.starters).toHaveLength(2)
    expect(lineup.starters.includes('p1')).toBe(false)
  })

  it('assignToBench moves player from starters to bench', () => {
    const lineup = assignToBench(
      makeLineup({ starters: ['p1'], targetMinutes: { p1: 32 } }),
      'p1',
    )
    expect(lineup.starters).toEqual([])
    expect(lineup.bench).toEqual(['p1'])
  })

  it('assignToBench rejects when bench is full', () => {
    const bench = Array.from({ length: 15 }, (_, i) => `b${i}`)
    const lineup = makeLineup({ bench })
    const next = assignToBench(lineup, 'new')
    expect(next.bench).toHaveLength(15)
    expect(next.bench.includes('new')).toBe(false)
  })

  it('removeFromRotation clears minutes and closing slot', () => {
    const lineup = removeFromRotation(
      makeLineup({
        starters: ['p1'],
        closingLineup: ['p1', 'p2'],
        targetMinutes: { p1: 32 },
      }),
      'p1',
    )
    expect(lineup.starters).toEqual([])
    expect(lineup.closingLineup).toEqual(['p2'])
    expect(lineup.targetMinutes.p1).toBeUndefined()
  })

  it('moveBetweenSections moves pool player to bench', () => {
    const lineup = moveBetweenSections(makeLineup(), 'p1', 'pool', 'bench')
    expect(lineup.bench).toEqual(['p1'])
  })

  it('computeRotationMinutesTotal sums rotation minutes only', () => {
    const lineup = makeLineup({
      starters: ['p1'],
      bench: ['p2'],
      targetMinutes: { p1: 30, p2: 20, p3: 99 },
    })
    expect(computeRotationMinutesTotal(lineup)).toBe(50)
  })

  it('uniquePlayerIds removes duplicates preserving order', () => {
    expect(uniquePlayerIds(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
  })

  it('balanceRotationMinutes distributes evenly when total is zero', () => {
    const lineup = balanceRotationMinutes(
      makeLineup({
        starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
        bench: ['p6', 'p7'],
      }),
    )
    expect(computeRotationMinutesTotal(lineup)).toBe(TOTAL_ROTATION_MINUTES)
  })

  it('balanceRotationMinutes adjusts existing minutes toward 240', () => {
    const lineup = balanceRotationMinutes(
      makeLineup({
        starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
        targetMinutes: {
          p1: 40,
          p2: 40,
          p3: 40,
          p4: 40,
          p5: 40,
        },
      }),
    )
    expect(computeRotationMinutesTotal(lineup)).toBe(TOTAL_ROTATION_MINUTES)
  })
})
