import { describe, it, expect } from 'vitest'
import { mergeBoxScoreIntoSeasonStats } from '@/game/league/seasonStatsEngine'
import { makePlayer } from '@/tests/fixtures'
import type { PlayerGameStats } from '@/game/models/sim'

function line(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'p1',
    teamId: 't1',
    started: true,
    minutes: 32,
    points: 28,
    fgm: 10,
    fga: 18,
    tpm: 3,
    tpa: 7,
    ftm: 5,
    fta: 6,
    offensiveRebounds: 1,
    defensiveRebounds: 6,
    totalRebounds: 7,
    assists: 5,
    turnovers: 2,
    steals: 1,
    blocks: 0,
    fouls: 2,
    plusMinus: 8,
    shotsAtRim: { made: 0, attempted: 0 },
    shotsShortMid: { made: 0, attempted: 0 },
    shotsLongMid: { made: 0, attempted: 0 },
    shotsCornerThree: { made: 0, attempted: 0 },
    shotsAboveBreakThree: { made: 0, attempted: 0 },
    ...overrides,
  }
}

describe('mergeBoxScoreIntoSeasonStats', () => {
  it('accumulates counting stats from a box score line', () => {
    const player = makePlayer({ id: 'p1', teamId: 't1' })
    mergeBoxScoreIntoSeasonStats(player, line(), '2025-26')
    expect(player.seasonStats.gamesPlayed).toBe(1)
    expect(player.seasonStats.points).toBe(28)
    expect(player.seasonStats.fieldGoalsMade).toBe(10)
    expect(player.seasonStats.threePointersMade).toBe(3)
  })

  it('skips zero-minute lines', () => {
    const player = makePlayer({ id: 'p1' })
    mergeBoxScoreIntoSeasonStats(player, line({ minutes: 0 }), '2025-26')
    expect(player.seasonStats.gamesPlayed).toBe(0)
  })

  it('resets when season label changes', () => {
    const player = makePlayer({ id: 'p1' })
    mergeBoxScoreIntoSeasonStats(player, line({ points: 20 }), '2024-25')
    mergeBoxScoreIntoSeasonStats(player, line({ points: 30 }), '2025-26')
    expect(player.seasonStats.season).toBe('2025-26')
    expect(player.seasonStats.points).toBe(30)
    expect(player.seasonStats.gamesPlayed).toBe(1)
  })
})
