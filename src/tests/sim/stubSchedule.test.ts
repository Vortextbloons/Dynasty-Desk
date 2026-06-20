// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateStubSchedule } from '@/game/sim/stubSchedule'
import { makeTeam } from '@/tests/sim/fixtures'

describe('generateStubSchedule', () => {
  it('returns the requested number of games', () => {
    const teams = [
      makeTeam({ id: 'home' }),
      makeTeam({ id: 'a' }),
      makeTeam({ id: 'b' }),
      makeTeam({ id: 'c' }),
    ]
    const games = generateStubSchedule({
      startDate: '2025-10-21',
      userTeamId: 'home',
      teams,
      count: 3,
    })
    expect(games).toHaveLength(3)
  })

  it('alternates home and away', () => {
    const teams = [
      makeTeam({ id: 'home' }),
      makeTeam({ id: 'a' }),
      makeTeam({ id: 'b' }),
    ]
    const games = generateStubSchedule({
      startDate: '2025-10-21',
      userTeamId: 'home',
      teams,
      count: 2,
    })
    expect(games[0]!.homeTeamId).toBe('home')
    expect(games[1]!.homeTeamId).toBe('a')
  })

  it('games are on consecutive days', () => {
    const teams = [makeTeam({ id: 'home' }), makeTeam({ id: 'a' })]
    const games = generateStubSchedule({
      startDate: '2025-10-21',
      userTeamId: 'home',
      teams,
      count: 3,
    })
    expect(games[0]!.date).toBe('2025-10-21')
    expect(games[1]!.date).toBe('2025-10-22')
    expect(games[2]!.date).toBe('2025-10-23')
  })

  it('returns empty when no opponents', () => {
    const games = generateStubSchedule({
      startDate: '2025-10-21',
      userTeamId: 'home',
      teams: [makeTeam({ id: 'home' })],
    })
    expect(games).toEqual([])
  })
})
