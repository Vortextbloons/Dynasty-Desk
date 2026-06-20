// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  applyLeagueInjuryRecovery,
  computeBackToBackTeams,
} from '@/game/league/gameFinalization'
import { makePlayer } from '@/tests/fixtures'
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

  it('ticks injury recovery league-wide when calendar advances', () => {
    const injured = makePlayer({
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
    const idle = makePlayer({
      id: 'p2',
      teamId: 't2',
      health: {
        status: 'day_to_day',
        injuryDescription: 'knee',
        daysRemaining: 4,
        gamesRemaining: 2,
        injuryHistory: [],
      },
    })
    const league = {
      players: { p1: injured, p2: idle },
    } as any

    applyLeagueInjuryRecovery(league, 2)
    expect(injured.health.gamesRemaining).toBe(3)
    expect(idle.health.gamesRemaining).toBe(0)
    expect(idle.health.status).toBe('healthy')
  })
})
