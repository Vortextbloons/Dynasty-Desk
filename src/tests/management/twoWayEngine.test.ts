// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { canSignTwoWay, MAX_TWO_WAY_PLAYERS } from '@/game/management/twoWayEngine'
import { makePlayer, makeTeam } from '@/tests/fixtures'

describe('twoWayEngine', () => {
  it('max 3 two-way players per team', () => {
    const team = makeTeam({ twoWayPlayers: ['a', 'b', 'c'] })
    const player = makePlayer({ age: 20 })
    const result = canSignTwoWay(team, player)
    expect(result.canSign).toBe(false)
    expect(MAX_TWO_WAY_PLAYERS).toBe(3)
  })

  it('2+ year vets cannot be two-way', () => {
    const team = makeTeam({ twoWayPlayers: [] })
    const player = makePlayer({ age: 25 })
    const result = canSignTwoWay(team, player)
    expect(result.canSign).toBe(false)
  })

  it('allows young prospect', () => {
    const team = makeTeam({ twoWayPlayers: [], roster: [] })
    const player = makePlayer({ age: 20, teamId: null })
    expect(canSignTwoWay(team, player).canSign).toBe(true)
  })
})
