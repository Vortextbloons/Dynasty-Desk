// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateAutoRotation } from '@/game/management/autoRotation'
import { emptyHealth } from '@/game/models/defaults'
import { validateRotation } from '@/game/management/rotationValidator'
import type { Player } from '@/game/models/player'
import { makePlayer } from '@/tests/fixtures'

function makePlayers(specs: { id: string; overall: number; position?: Player['position']; ballHandling?: number; passing?: number; interiorDefense?: number; perimeterDefense?: number; defensiveIq?: number; stamina?: number; health?: Player['health'] }[]): Map<string, Player> {
  const map = new Map<string, Player>()
  for (const s of specs) {
    map.set(s.id, makePlayer({
      id: s.id,
      position: s.position ?? 'SF',
      ratings: {
        insideScoring: 50, closeShot: 50, midrange: 50, threePoint: 50,
        freeThrow: 50, ballHandling: s.ballHandling ?? 50, passing: s.passing ?? 50, offensiveIq: 50,
        offensiveRebound: 50, defensiveRebound: 50,
        perimeterDefense: s.perimeterDefense ?? 50, interiorDefense: s.interiorDefense ?? 50, steal: 50, block: 50,
        defensiveIq: s.defensiveIq ?? 50, speed: 50, strength: 50, vertical: 50,
        stamina: s.stamina ?? 50, durability: 50, clutch: 50, consistency: 50,
        potential: 50, overall: s.overall,
      },
      health: s.health ?? emptyHealth(),
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

  it('top 2 overall players get the most minutes among starters', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 90 - i * 3,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const starterMinutes = lineup.starters.map((id) => ({
      id,
      min: lineup.targetMinutes[id] ?? 0,
    }))
    starterMinutes.sort((a, b) => b.min - a.min)
    expect(starterMinutes[0]!.min).toBeGreaterThanOrEqual(35)
    expect(starterMinutes[0]!.min).toBeLessThanOrEqual(38)
    expect(starterMinutes[1]!.min).toBeGreaterThanOrEqual(34)
    expect(starterMinutes[1]!.min).toBeLessThanOrEqual(38)
    expect(starterMinutes[0]!.min).toBeGreaterThanOrEqual(starterMinutes[4]!.min)
  })

  it('swaps a bench ball handler into the starters', () => {
    const specs = [
      { id: 'p1', overall: 95, position: 'PG' as const },
      { id: 'p2', overall: 94, position: 'SG' as const },
      { id: 'p3', overall: 93, position: 'SF' as const },
      { id: 'p4', overall: 92, position: 'PF' as const },
      { id: 'p5', overall: 91, position: 'C' as const, interiorDefense: 80 },
      { id: 'bh', overall: 60, position: 'PG' as const, ballHandling: 80, passing: 75 },
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `bench${i}`,
        overall: 59 - i,
        position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
      })),
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    expect(lineup.starters).toContain('bh')
    expect(lineup.starters.filter((id) => id.startsWith('p'))).toHaveLength(4)
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
        health: { status: 'season_ending' as const, injuryDescription: 'ACL', daysRemaining: 0, gamesRemaining: 0, injuryHistory: [] },
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

  it('produces a rotation that passes validation', () => {
    const specs: { id: string; overall: number; position?: Player['position']; ballHandling?: number; passing?: number; interiorDefense?: number; health?: Player['health'] }[] = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    // Give one player ball-handler stats
    specs[0]!.ballHandling = 80
    specs[0]!.passing = 75
    // Give one player center stats
    specs[4]!.position = 'C'
    specs[4]!.interiorDefense = 80

    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const result = validateRotation(roster, lineup, players)
    expect(result.ok).toBe(true)
  })

  it('ensures positional diversity in starters when possible', () => {
    const specs = [
      { id: 'pg1', overall: 95, position: 'PG' as const, ballHandling: 80, passing: 75 },
      { id: 'pg2', overall: 93, position: 'PG' as const, ballHandling: 80, passing: 75 },
      { id: 'pg3', overall: 91, position: 'PG' as const, ballHandling: 80, passing: 75 },
      { id: 'sg1', overall: 85, position: 'SG' as const },
      { id: 'sf1', overall: 80, position: 'SF' as const },
      { id: 'pf1', overall: 78, position: 'PF' as const },
      { id: 'c1', overall: 76, position: 'C' as const, interiorDefense: 80 },
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `bench${i}`,
        overall: 60 - i,
        position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
      })),
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const positions = lineup.starters.map((id) => players.get(id)!.position)
    const hasSF = positions.includes('SF')
    expect(hasSF).toBe(true)
  })

  it('gives star player more minutes than bench players', () => {
    const specs = [
      { id: 'star', overall: 95, position: 'PG' as const, ballHandling: 80, passing: 75 },
      { id: 's2', overall: 75, position: 'SG' as const },
      { id: 's3', overall: 74, position: 'SF' as const },
      { id: 's4', overall: 73, position: 'PF' as const },
      { id: 's5', overall: 72, position: 'C' as const, interiorDefense: 80 },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `bench${i}`,
        overall: 65 - i,
        position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
      })),
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const starMin = lineup.targetMinutes['star'] ?? 0
    const avgBenchMin =
      lineup.bench.reduce((a, id) => a + (lineup.targetMinutes[id] ?? 0), 0) /
      lineup.bench.length
    expect(starMin).toBeGreaterThan(avgBenchMin)
    expect(starMin).toBeGreaterThanOrEqual(35)
  })

  it('high stamina player gets more minutes than low stamina peer', () => {
    const specs = [
      { id: 'high_stam', overall: 80, position: 'PG' as const, ballHandling: 80, passing: 75, stamina: 90 },
      { id: 'low_stam', overall: 80, position: 'SG' as const, stamina: 40 },
      { id: 's3', overall: 78, position: 'SF' as const },
      { id: 's4', overall: 77, position: 'PF' as const },
      { id: 's5', overall: 76, position: 'C' as const, interiorDefense: 80 },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `bench${i}`,
        overall: 65 - i,
        position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
      })),
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const highMin = lineup.targetMinutes['high_stam'] ?? 0
    const lowMin = lineup.targetMinutes['low_stam'] ?? 0
    expect(highMin).toBeGreaterThan(lowMin)
  })

  it('closing lineup can include deep bench players', () => {
    const specs = [
      { id: 's1', overall: 80, position: 'PG' as const, ballHandling: 80, passing: 75 },
      { id: 's2', overall: 78, position: 'SG' as const },
      { id: 's3', overall: 76, position: 'SF' as const },
      { id: 's4', overall: 74, position: 'PF' as const },
      { id: 's5', overall: 72, position: 'C' as const, interiorDefense: 80 },
      { id: 'b1', overall: 70, position: 'SG' as const, perimeterDefense: 90, defensiveIq: 90 },
      { id: 'b2', overall: 68, position: 'SF' as const },
      { id: 'b3', overall: 66, position: 'PF' as const },
      { id: 'b4', overall: 64, position: 'C' as const },
      { id: 'b5', overall: 62, position: 'PG' as const },
      { id: 'b6', overall: 60, position: 'SG' as const },
      { id: 'b7', overall: 58, position: 'SF' as const },
      { id: 'b8', overall: 56, position: 'PF' as const },
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const closingScores = lineup.closingLineup.map((id) => ({
      id,
      score: (
        (players.get(id)!.ratings.overall * 0.4 +
          players.get(id)!.ratings.perimeterDefense * 0.15 +
          players.get(id)!.ratings.interiorDefense * 0.1 +
          players.get(id)!.ratings.defensiveIq * 0.15 +
          players.get(id)!.ratings.freeThrow * 0.1 +
          players.get(id)!.ratings.clutch * 0.1)
      ),
    }))
    const b1Score = (
      players.get('b1')!.ratings.overall * 0.4 +
      players.get('b1')!.ratings.perimeterDefense * 0.15 +
      players.get('b1')!.ratings.interiorDefense * 0.1 +
      players.get('b1')!.ratings.defensiveIq * 0.15 +
      players.get('b1')!.ratings.freeThrow * 0.1 +
      players.get('b1')!.ratings.clutch * 0.1
    )
    const lowestClosing = closingScores.sort((a, b) => a.score - b.score)[0]!
    expect(lowestClosing.score).toBeLessThanOrEqual(b1Score)
    expect(lineup.closingLineup).toHaveLength(5)
  })

  it('star gets at most 38 minutes', () => {
    const specs = [
      { id: 'star', overall: 99, position: 'PG' as const, ballHandling: 80, passing: 75 },
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `r${i}`,
        overall: 70 - i,
        position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
      })),
    ]
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    const starMin = lineup.targetMinutes['star'] ?? 0
    expect(starMin).toBeLessThanOrEqual(38)
  })

  it('bench player gets at least 4 minutes', () => {
    const specs = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      overall: 80 - i * 2,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5],
    }))
    const players = makePlayers(specs)
    const roster = specs.map((s) => s.id)

    const lineup = generateAutoRotation(roster, players)
    for (const id of lineup.bench) {
      expect(lineup.targetMinutes[id] ?? 0).toBeGreaterThanOrEqual(4)
    }
  })
})
