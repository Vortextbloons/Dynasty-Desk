import { describe, it, expect } from 'vitest'
import { buildBoxScore, checkConsistency } from '@/game/sim/boxScoreBuilder'
import type { GameState, SimEvent } from '@/game/models/sim'

function makeGameState(events: SimEvent[]): GameState {
  return {
    id: 'g1',
    homeTeamId: 't-home',
    awayTeamId: 't-away',
    date: '2025-10-21',
    status: 'final',
    attendance: 18000,
    arena: 'Crypto.com',
    clock: { period: 4, timeRemainingSeconds: 0 },
    score: { home: 5, away: 3 },
    possession: 'home',
    arrow: 'home',
    teamStats: {
      home: {
        teamId: 't-home',
        points: 5, fgm: 2, fga: 4, tpm: 1, tpa: 2, ftm: 0, fta: 0,
        offensiveRebounds: 0, defensiveRebounds: 2, totalRebounds: 2,
        assists: 1, turnovers: 0, steals: 0, blocks: 0, fouls: 0,
        fastBreakPoints: 0, pointsInPaint: 4, secondChancePoints: 0, benchPoints: 0,
      },
      away: {
        teamId: 't-away',
        points: 3, fgm: 1, fga: 3, tpm: 1, tpa: 1, ftm: 0, fta: 0,
        offensiveRebounds: 0, defensiveRebounds: 1, totalRebounds: 1,
        assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0,
        fastBreakPoints: 0, pointsInPaint: 0, secondChancePoints: 0, benchPoints: 0,
      },
    },
    playerStats: {},
    fouls: {
      home: { team: 0, byPlayer: {} },
      away: { team: 0, byPlayer: {} },
    },
    lineupOnCourt: { home: ['h1', 'h2', 'h3', 'h4', 'h5'], away: ['a1', 'a2', 'a3', 'a4', 'a5'] },
    startingLineups: { home: ['h1', 'h2', 'h3', 'h4', 'h5'], away: ['a1', 'a2', 'a3', 'a4', 'a5'] },
    minutesPlayed: {
      h1: 30, h2: 30, h3: 30, h4: 30, h5: 30,
      a1: 30, a2: 30, a3: 30, a4: 30, a5: 30,
    },
    events,
    injuriesEnabled: false,
    overtimeOccurred: false,
    overtimeTiebreakerUsed: false,
    homeWin: true,
  }
}

describe('buildBoxScore', () => {
  it('sums points per team from made shots', () => {
    const events: SimEvent[] = [
      {
        type: 'shot', playerId: 'h1', teamId: 't-home',
        zone: 'at_rim', shotType: 'drive', made: true,
        period: 1, timeRemainingSeconds: 600, impact: 75,
      },
      {
        type: 'shot', playerId: 'h1', teamId: 't-home',
        zone: 'at_rim', shotType: 'drive', made: true,
        period: 1, timeRemainingSeconds: 500, impact: 75,
      },
      {
        type: 'shot', playerId: 'a1', teamId: 't-away',
        zone: 'corner_three', shotType: 'catch_and_shoot', made: true,
        period: 1, timeRemainingSeconds: 400, impact: 85,
      },
    ]
    const box = buildBoxScore({ gameState: makeGameState(events), keyPlays: events })
    expect(box.playerStats['h1']!.points).toBe(4)
    expect(box.playerStats['a1']!.points).toBe(3)
    expect(box.teamStats.home.fga).toBe(2)
    expect(box.teamStats.away.tpm).toBe(1)
  })

  it('counts an assist', () => {
    const events: SimEvent[] = [
      {
        type: 'shot', playerId: 'h1', teamId: 't-home',
        zone: 'corner_three', shotType: 'catch_and_shoot', made: true,
        period: 1, timeRemainingSeconds: 600, impact: 85,
        assistedBy: 'h2',
      },
    ]
    const box = buildBoxScore({ gameState: makeGameState(events), keyPlays: events })
    expect(box.playerStats['h1']!.points).toBe(3)
    expect(box.playerStats['h2']!.assists).toBe(1)
    expect(box.teamStats.home.assists).toBe(1)
  })

  it('counts a block', () => {
    const events: SimEvent[] = [
      {
        type: 'shot', playerId: 'h1', teamId: 't-home',
        zone: 'at_rim', shotType: 'drive', made: false,
        period: 1, timeRemainingSeconds: 600, impact: 50,
        blockedBy: 'a2',
      },
    ]
    const box = buildBoxScore({ gameState: makeGameState(events), keyPlays: events })
    expect(box.playerStats['a2']!.blocks).toBe(1)
  })

  it('counts a steal on turnover', () => {
    const events: SimEvent[] = [
      {
        type: 'turnover', playerId: 'h1', teamId: 't-home',
        turnoverType: 'lost_ball', stolenBy: 'a3',
        period: 1, timeRemainingSeconds: 600, impact: 35,
      },
    ]
    const box = buildBoxScore({ gameState: makeGameState(events), keyPlays: events })
    expect(box.playerStats['a3']!.steals).toBe(1)
    expect(box.teamStats.away.steals).toBe(1)
    expect(box.playerStats['h1']!.turnovers).toBe(1)
    expect(box.teamStats.home.turnovers).toBe(1)
  })

  it('aggregates free throws', () => {
    const events: SimEvent[] = [
      { type: 'freeThrow', playerId: 'h1', teamId: 't-home', attempt: 1, made: true, period: 1, timeRemainingSeconds: 600 },
      { type: 'freeThrow', playerId: 'h1', teamId: 't-home', attempt: 2, made: true, period: 1, timeRemainingSeconds: 600 },
    ]
    const box = buildBoxScore({ gameState: makeGameState(events), keyPlays: events })
    expect(box.playerStats['h1']!.ftm).toBe(2)
    expect(box.playerStats['h1']!.points).toBe(2)
  })
})

describe('checkConsistency', () => {
  it('reports mismatches for hand-crafted bad data', () => {
    const events: SimEvent[] = [
      {
        type: 'shot', playerId: 'h1', teamId: 't-home',
        zone: 'at_rim', shotType: 'drive', made: true,
        period: 1, timeRemainingSeconds: 600, impact: 75,
      },
    ]
    const state = makeGameState(events)
    state.score = { home: 999, away: 0 }
    const box = buildBoxScore({ gameState: state, keyPlays: events })
    const result = checkConsistency(box)
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.includes('Home points'))).toBe(true)
  })
})
