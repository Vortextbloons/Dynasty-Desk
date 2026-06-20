import { describe, it, expect } from 'vitest'
import {
  applyInjuryRecoveryForTeams,
  computeBackToBackTeams,
} from '@/game/league/gameFinalization'
import { makePlayer, makeTeam } from '@/tests/fixtures'
import type { ScheduledGame } from '@/game/models/game'

describe('gameFinalization helpers', () => {
  it('detects back-to-back teams from prior final game', () => {
    const games: Record<string, ScheduledGame> = {
      prev: {
        id: 'prev',
        season: '2025-26',
        date: '2025-10-20',
        homeTeamId: 't1',
        awayTeamId: 't2',
        status: 'final',
        homeScore: 100,
        awayScore: 90,
        boxScoreId: 'prev',
        isConference: false,
        isDivision: false,
        seasonYear: 2026,
        isUserTeamGame: false,
      },
    }
    const b2b = computeBackToBackTeams(games, 't1', 't3', '2025-10-21')
    expect(b2b.has('t1')).toBe(true)
    expect(b2b.has('t3')).toBe(false)
  })

  it('ticks injury recovery for injured roster players', () => {
    const team = makeTeam({ id: 't1', roster: ['p1'] })
    const player = makePlayer({
      id: 'p1',
      teamId: 't1',
      health: {
        status: 'short_term',
        injuryDescription: 'ankle',
        daysRemaining: 10,
        gamesRemaining: 5,
        injuryHistory: [],
      },
    })
    const league = {
      teams: { t1: team },
      players: { p1: player },
    } as any

    applyInjuryRecoveryForTeams(league, ['t1'])
    expect(player.health.gamesRemaining).toBe(4)
  })
})
