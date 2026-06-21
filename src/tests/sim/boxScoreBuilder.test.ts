// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildBoxScore, checkConsistency } from '@/game/sim/boxScoreBuilder'
import type { GameState, SimEvent, BoxScoreResult } from '@/game/models/sim'

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
    gameFatigue: {},
    events,
    injuriesEnabled: false,
    fatigueEnabled: false,
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
    expect(box.playerStats.h1!.points).toBe(4)
    expect(box.playerStats.a1!.points).toBe(3)
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
    expect(box.playerStats.h1!.points).toBe(3)
    expect(box.playerStats.h2!.assists).toBe(1)
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
    expect(box.playerStats.a2!.blocks).toBe(1)
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
    expect(box.playerStats.a3!.steals).toBe(1)
    expect(box.teamStats.away.steals).toBe(1)
    expect(box.playerStats.h1!.turnovers).toBe(1)
    expect(box.teamStats.home.turnovers).toBe(1)
  })

  it('aggregates free throws', () => {
    const events: SimEvent[] = [
      { type: 'freeThrow', playerId: 'h1', teamId: 't-home', attempt: 1, made: true, period: 1, timeRemainingSeconds: 600 },
      { type: 'freeThrow', playerId: 'h1', teamId: 't-home', attempt: 2, made: true, period: 1, timeRemainingSeconds: 600 },
    ]
    const box = buildBoxScore({ gameState: makeGameState(events), keyPlays: events })
    expect(box.playerStats.h1!.ftm).toBe(2)
    expect(box.playerStats.h1!.points).toBe(2)
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

  it('detects mismatches in FT, 3P, assists, steals, blocks, fouls', () => {
    const box = {
      homeTeamId: 'h',
      awayTeamId: 'a',
      homeScore: 100,
      awayScore: 90,
      homeWin: true,
      overtimeOccurred: false,
      teamStats: {
        home: { teamId: 'h', points: 10, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 5, fta: 6, offensiveRebounds: 0, defensiveRebounds: 0, totalRebounds: 0, assists: 3, turnovers: 0, steals: 2, blocks: 1, fouls: 4, fastBreakPoints: 0, pointsInPaint: 0, secondChancePoints: 0, benchPoints: 0 },
        away: { teamId: 'a', points: 10, fgm: 0, fga: 0, tpm: 2, tpa: 5, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 0, totalRebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, fastBreakPoints: 0, pointsInPaint: 0, secondChancePoints: 0, benchPoints: 0 },
      },
      playerStats: {
        p1: { playerId: 'p1', teamId: 'h', started: true, minutes: 30, points: 10, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 0, totalRebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, plusMinus: 0, shotsAtRim: { made: 0, attempted: 0 }, shotsShortMid: { made: 0, attempted: 0 }, shotsLongMid: { made: 0, attempted: 0 }, shotsCornerThree: { made: 0, attempted: 0 }, shotsAboveBreakThree: { made: 0, attempted: 0 } },
        p2: { playerId: 'p2', teamId: 'a', started: true, minutes: 30, points: 10, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 0, totalRebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, plusMinus: 0, shotsAtRim: { made: 0, attempted: 0 }, shotsShortMid: { made: 0, attempted: 0 }, shotsLongMid: { made: 0, attempted: 0 }, shotsCornerThree: { made: 0, attempted: 0 }, shotsAboveBreakThree: { made: 0, attempted: 0 } },
      },
      keyPlays: [],
    } as unknown as BoxScoreResult
    const result = checkConsistency(box)
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.includes('Home FT'))).toBe(true)
    expect(result.issues.some((i) => i.includes('Home AST'))).toBe(true)
    expect(result.issues.some((i) => i.includes('Home STL'))).toBe(true)
    expect(result.issues.some((i) => i.includes('Home BLK'))).toBe(true)
    expect(result.issues.some((i) => i.includes('Home PF'))).toBe(true)
    expect(result.issues.some((i) => i.includes('Away 3P'))).toBe(true)
    expect(result.issues.some((i) => i.includes('Away 3PA'))).toBe(true)
  })

  it('passes when all stat categories are consistent', () => {
    const box = {
      homeTeamId: 'h',
      awayTeamId: 'a',
      homeScore: 5,
      awayScore: 3,
      homeWin: true,
      overtimeOccurred: false,
      teamStats: {
        home: { teamId: 'h', points: 5, fgm: 2, fga: 4, tpm: 1, tpa: 2, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 2, totalRebounds: 2, assists: 1, turnovers: 0, steals: 0, blocks: 0, fouls: 0, fastBreakPoints: 0, pointsInPaint: 4, secondChancePoints: 0, benchPoints: 0 },
        away: { teamId: 'a', points: 3, fgm: 1, fga: 3, tpm: 1, tpa: 1, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 1, totalRebounds: 1, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, fastBreakPoints: 0, pointsInPaint: 0, secondChancePoints: 0, benchPoints: 0 },
      },
      playerStats: {
        h1: { playerId: 'h1', teamId: 'h', started: true, minutes: 30, points: 2, fgm: 1, fga: 2, tpm: 0, tpa: 0, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 1, totalRebounds: 1, assists: 1, turnovers: 0, steals: 0, blocks: 0, fouls: 0, plusMinus: 0, shotsAtRim: { made: 1, attempted: 2 }, shotsShortMid: { made: 0, attempted: 0 }, shotsLongMid: { made: 0, attempted: 0 }, shotsCornerThree: { made: 0, attempted: 0 }, shotsAboveBreakThree: { made: 0, attempted: 0 } },
        h2: { playerId: 'h2', teamId: 'h', started: true, minutes: 30, points: 3, fgm: 1, fga: 2, tpm: 1, tpa: 2, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 1, totalRebounds: 1, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, plusMinus: 0, shotsAtRim: { made: 0, attempted: 0 }, shotsShortMid: { made: 0, attempted: 0 }, shotsLongMid: { made: 0, attempted: 0 }, shotsCornerThree: { made: 1, attempted: 2 }, shotsAboveBreakThree: { made: 0, attempted: 0 } },
        a1: { playerId: 'a1', teamId: 'a', started: true, minutes: 30, points: 3, fgm: 1, fga: 3, tpm: 1, tpa: 1, ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 1, totalRebounds: 1, assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0, plusMinus: 0, shotsAtRim: { made: 0, attempted: 0 }, shotsShortMid: { made: 0, attempted: 0 }, shotsLongMid: { made: 0, attempted: 0 }, shotsCornerThree: { made: 1, attempted: 1 }, shotsAboveBreakThree: { made: 0, attempted: 0 } },
      },
      keyPlays: [],
    } as unknown as BoxScoreResult
    const result = checkConsistency(box)
    expect(result.ok).toBe(true)
    expect(result.issues.length).toBe(0)
  })
})
