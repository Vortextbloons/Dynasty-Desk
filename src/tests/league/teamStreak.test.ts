// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeTeamStreak } from '@/game/league/teamStreak'
import type { ScheduledGame } from '@/game/models/game'

function game(
  id: string,
  date: string,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
): ScheduledGame {
  return {
    id,
    season: '2025-26',
    date,
    homeTeamId: home,
    awayTeamId: away,
    status: 'final',
    homeScore,
    awayScore,
    boxScoreId: null,
    isConference: false,
    isDivision: false,
    seasonYear: 2026,
    isUserTeamGame: false,
    winnerTeamId: homeScore > awayScore ? home : away,
  }
}

describe('computeTeamStreak', () => {
  it('counts consecutive wins from most recent games', () => {
    const games = {
      g1: game('g1', '2026-01-03', 'team-a', 'team-b', 110, 100),
      g2: game('g2', '2026-01-01', 'team-c', 'team-a', 90, 105),
      g3: game('g3', '2025-12-30', 'team-a', 'team-d', 108, 99),
    }
    expect(computeTeamStreak(games, 'team-a')).toEqual({ wins: 3, losses: 0 })
  })

  it('counts consecutive losses', () => {
    const games = {
      g1: game('g1', '2026-01-03', 'team-a', 'team-b', 90, 100),
      g2: game('g2', '2026-01-01', 'team-c', 'team-a', 110, 95),
    }
    expect(computeTeamStreak(games, 'team-a')).toEqual({ wins: 0, losses: 2 })
  })
})
