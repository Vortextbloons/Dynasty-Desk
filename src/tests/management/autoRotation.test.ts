import { describe, it, expect } from 'vitest'
import { generateAutoRotation } from '@/game/management/autoRotation'
import type { Player } from '@/game/models/player'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test',
    firstName: 'Test',
    lastName: 'Player',
    age: 25,
    position: 'PG',
    secondaryPositions: [],
    heightInches: 75,
    weightLbs: 190,
    teamId: 'team-1',
    ratings: {
      insideScoring: 50, closeShot: 50, midrange: 50, threePoint: 50,
      freeThrow: 50, ballHandling: 50, passing: 50, offensiveIq: 50,
      offensiveRebound: 50, defensiveRebound: 50,
      perimeterDefense: 50, interiorDefense: 50, steal: 50, block: 50,
      defensiveIq: 50, speed: 50, strength: 50, vertical: 50,
      stamina: 50, durability: 50, clutch: 50, consistency: 50,
      potential: 50, overall: 50,
    },
    tendencies: {} as any,
    traits: {} as any,
    contract: {} as any,
    morale: { level: 50, happiness: 50, roleSatisfaction: 75, teamSatisfaction: 50, tradeRequest: false, tradeRequestLevel: 0 },
    health: { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0 },
    development: { lastTrainedAt: null, focusArea: null, recentForm: 50, ageAtPeak: 27, progressionCurve: 'normal', ratingsDelta: {}, breakoutChance: 0.1, bustRisk: 0.1 },
    seasonStats: {} as any,
    careerStats: [],
    historicalSeasons: [],
    ...overrides,
  }
}

function makePlayers(specs: Array<{ id: string; overall: number; position?: Player['position']; ballHandling?: number; passing?: number; interiorDefense?: number; health?: Player['health'] }>): Map<string, Player> {
  const map = new Map<string, Player>()
  for (const s of specs) {
    map.set(s.id, makePlayer({
      id: s.id,
      position: s.position ?? 'SF',
      ratings: {
        insideScoring: 50, closeShot: 50, midrange: 50, threePoint: 50,
        freeThrow: 50, ballHandling: s.ballHandling ?? 50, passing: s.passing ?? 50, offensiveIq: 50,
        offensiveRebound: 50, defensiveRebound: 50,
        perimeterDefense: 50, interiorDefense: s.interiorDefense ?? 50, steal: 50, block: 50,
        defensiveIq: 50, speed: 50, strength: 50, vertical: 50,
        stamina: 50, durability: 50, clutch: 50, consistency: 50,
        potential: 50, overall: s.overall,
      },
      health: s.health ?? { status: 'healthy', injuryDescription: null, daysRemaining: 0, gamesRemaining: 0 },
    }))
  }
  return map
}

describe('generateAutoRotation', () => {
  it('produces 5 starters and a bench from 13 active players', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    expect(lineup.starters).toHaveLength(5)
    expect(lineup.bench).toHaveLength(8)
  })

  it('total target minutes equals 240', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const total = Object.values(lineup.targetMinutes).reduce((a, b) => a + b, 0)
    expect(total).toBe(240)
  })

  it('top 2 overall players get at least 34 minutes each', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 90 - i * 3,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const p1Minutes = lineup.targetMinutes['p1'] ?? 0
    const p2Minutes = lineup.targetMinutes['p2'] ?? 0
    expect(p1Minutes).toBeGreaterThanOrEqual(34)
    expect(p2Minutes).toBeGreaterThanOrEqual(34)
  })

  it('includes a center in starters when one is available', () => {
    const specs = [
      { id: 'pg', overall: 85, position: 'PG' as const, ballHandling: 80, passing: 75 },
      { id: 'sg', overall: 80, position: 'SG' as const },
      { id: 'sf', overall: 78, position: 'SF' as const },
      { id: 'pf', overall: 76, position: 'PF' as const },
      { id: 'c', overall: 74, position: 'C' as const, interiorDefense: 80 },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `bench${i}`,
        overall: 60 - i,
        position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
      })),
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const starterPositions = lineup.starters
      .map((id) => players.get(id)!)
      .map((p) => p.position)
    expect(starterPositions).toContain('C')
  })

  it('marks generatedByAutoRotate as true', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    expect(lineup.generatedByAutoRotate).toBe(true)
    expect(lineup.autoRotation).toBe(true)
  })

  it('excludes season-ending injured players', () => {
    const specs = [
      { id: 'p1', overall: 90, position: 'PG' as const },
      { id: 'p2', overall: 88, position: 'SG' as const },
      { id: 'p3', overall: 86, position: 'SF' as const },
      { id: 'p4', overall: 84, position: 'PF' as const },
      { id: 'p5', overall: 82, position: 'C' as const },
      { id: 'p6', overall: 80, position: 'PG' as const },
      { id: 'p7', overall: 78, position: 'SG' as const },
      { id: 'p8', overall: 76, position: 'SF' as const },
      { id: 'p9', overall: 74, position: 'PF' as const },
      { id: 'p10', overall: 72, position: 'C' as const },
      { id: 'p11', overall: 70, position: 'PG' as const },
      { id: 'p12', overall: 68, position: 'SG' as const },
      {
        id: 'injured',
        overall: 95,
        position: 'PG' as const,
        health: { status: 'season_ending' as const, injuryDescription: 'ACL', daysRemaining: 0, gamesRemaining: 0 },
      },
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    expect(lineup.starters).not.toContain('injured')
    expect(lineup.bench).not.toContain('injured')
  })

  it('closing lineup is a subset of starters + bench', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const pool = new Set([...lineup.starters, ...lineup.bench])
    for (const id of lineup.closingLineup) {
      expect(pool.has(id)).toBe(true)
    }
  })

  it('closing lineup has 5 players', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    expect(lineup.closingLineup).toHaveLength(5)
  })

  it('all players in lineup are on the roster', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const rosterSet = new Set(roster)
    for (const id of [...lineup.starters, ...lineup.bench]) {
      expect(rosterSet.has(id)).toBe(true)
    }
  })
})
