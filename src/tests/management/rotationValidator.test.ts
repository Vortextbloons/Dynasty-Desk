import { describe, it, expect } from 'vitest'
import { validateRotation } from '@/game/management/rotationValidator'
import type { Player } from '@/game/models/player'
import type { LineupSettings } from '@/game/models/team'
import { makePlayer } from '@/tests/fixtures'

function makeLineup(overrides: Partial<LineupSettings> = {}): LineupSettings {
  return {
    starters: [],
    bench: [],
    closingLineup: [],
    targetMinutes: {},
    autoRotation: true,
    ...overrides,
  }
}

function makePlayers(ids: string[], overrides?: Partial<Player>): Map<string, Player> {
  const map = new Map<string, Player>()
  for (const id of ids) {
    map.set(id, makePlayer({ id, ...overrides }))
  }
  return map
}

describe('validateRotation', () => {
  describe('starters', () => {
    it('returns no warnings for 5 starters', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 36, p2: 36, p3: 32, p4: 32, p5: 32 },
      })
      const result = validateRotation(ids, lineup, players)
      const starterWarnings = result.warnings.filter(w => w.code === 'not_five_starters')
      expect(starterWarnings).toHaveLength(0)
    })

    it('warns when not 5 starters', () => {
      const ids = ['p1', 'p2', 'p3', 'p4']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ['p1', 'p2', 'p3', 'p4', 'p5'],
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'not_five_starters')).toBe(true)
    })
  })

  describe('closing lineup', () => {
    it('returns no warning for 5 closing players', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 36, p2: 36, p3: 32, p4: 32, p5: 32 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'not_five_closing')).toBe(false)
    })

    it('warns when closing lineup is not 5', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ['p1', 'p2', 'p3'],
        targetMinutes: { p1: 36, p2: 36, p3: 32, p4: 32, p5: 32 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'not_five_closing')).toBe(true)
    })
  })

  describe('minutes', () => {
    it('returns no warning when minutes sum to 240', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'minutes_not_240')).toBe(false)
      expect(result.totalMinutes).toBe(240)
    })

    it('warns when minutes sum to 220', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 44, p2: 44, p3: 44, p4: 44, p5: 44 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'minutes_not_240')).toBe(true)
    })

    it('allows ±2 tolerance around 240', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)

      const lowLineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 46 },
      })
      const lowResult = validateRotation(ids, lowLineup, players)
      expect(lowResult.warnings.some(w => w.code === 'minutes_not_240')).toBe(false)

      const highLineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 50 },
      })
      const highResult = validateRotation(ids, highLineup, players)
      expect(highResult.warnings.some(w => w.code === 'minutes_not_240')).toBe(false)
    })

    it('warns outside ±2 tolerance', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)

      const lowLineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 45 },
      })
      const lowResult = validateRotation(ids, lowLineup, players)
      expect(lowResult.warnings.some(w => w.code === 'minutes_not_240')).toBe(true)

      const highLineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 51 },
      })
      const highResult = validateRotation(ids, highLineup, players)
      expect(highResult.warnings.some(w => w.code === 'minutes_not_240')).toBe(true)
    })
  })

  describe('duplicates', () => {
    it('warns when player is in both starters and bench', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
        bench: ['p1', 'p6'],
        closingLineup: ['p1', 'p2', 'p3', 'p4', 'p5'],
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'duplicate_player')).toBe(true)
    })
  })

  describe('roster membership', () => {
    it('warns when player is not on roster', () => {
      const rosterIds = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(rosterIds)
      const lineup = makeLineup({
        starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
        bench: ['p6'],
        closingLineup: ['p1', 'p2', 'p3', 'p4', 'p5'],
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(rosterIds, lineup, players)
      expect(result.warnings.some(w => w.code === 'player_not_on_roster')).toBe(true)
    })
  })

  describe('injuries', () => {
    it('warns when injured player is in rotation without forceInclude', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const injured = players.get('p1')!
      injured.health = { status: 'day_to_day', injuryDescription: 'Ankle', daysRemaining: 3, gamesRemaining: 2 }
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'injured_player_in_rotation')).toBe(true)
    })

    it('warns injured_player_force_included when forceInclude is set', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const injured = players.get('p1')!
      injured.health = { status: 'short_term', injuryDescription: 'Knee', daysRemaining: 10, gamesRemaining: 7 }
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players, { p1: true })
      expect(result.warnings.some(w => w.code === 'injured_player_force_included')).toBe(true)
      expect(result.warnings.some(w => w.code === 'injured_player_in_rotation')).toBe(false)
    })

    it('does not warn for healthy players', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'injured_player_in_rotation')).toBe(false)
      expect(result.warnings.some(w => w.code === 'injured_player_force_included')).toBe(false)
    })
  })

  describe('ball handler', () => {
    it('warns when no ball handler in starters', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids, {
        ratings: {
          ...makePlayer().ratings,
          ballHandling: 50,
          passing: 50,
        },
      })
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'no_ball_handler')).toBe(true)
    })

    it('does not warn when a ball handler exists', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const pg = players.get('p1')!
      pg.ratings.ballHandling = 80
      pg.ratings.passing = 75
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'no_ball_handler')).toBe(false)
    })
  })

  describe('center', () => {
    it('warns when no center/PF in starters', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      // All players are PG with interiorDefense=50
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'no_center')).toBe(true)
    })

    it('does not warn when a center exists', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      const center = players.get('p5')!
      center.position = 'C'
      center.ratings.interiorDefense = 80
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.warnings.some(w => w.code === 'no_center')).toBe(false)
    })
  })

  describe('bench size', () => {
    it('warns when bench exceeds soft cap of 10', () => {
      const allIds = Array.from({ length: 16 }, (_, i) => `p${i + 1}`)
      const players = makePlayers(allIds)
      const lineup = makeLineup({
        starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
        bench: allIds.slice(5),
        closingLineup: ['p1', 'p2', 'p3', 'p4', 'p5'],
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(allIds, lineup, players)
      expect(result.warnings.some(w => w.code === 'bench_too_large')).toBe(true)
    })

    it('does not warn for 10 bench players', () => {
      const allIds = Array.from({ length: 15 }, (_, i) => `p${i + 1}`)
      const players = makePlayers(allIds)
      const lineup = makeLineup({
        starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
        bench: allIds.slice(5),
        closingLineup: ['p1', 'p2', 'p3', 'p4', 'p5'],
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(allIds, lineup, players)
      expect(result.warnings.some(w => w.code === 'bench_too_large')).toBe(false)
    })
  })

  describe('ok flag', () => {
    it('returns ok: true when no warnings', () => {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
      const players = makePlayers(ids)
      // Give them ball handler and center ratings
      const pg = players.get('p1')!
      pg.ratings.ballHandling = 80
      pg.ratings.passing = 75
      const c = players.get('p5')!
      c.position = 'C'
      c.ratings.interiorDefense = 80

      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
        targetMinutes: { p1: 48, p2: 48, p3: 48, p4: 48, p5: 48 },
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.ok).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('returns ok: false when warnings exist', () => {
      const ids = ['p1', 'p2', 'p3', 'p4']
      const players = makePlayers(ids)
      const lineup = makeLineup({
        starters: ids,
        closingLineup: ids,
      })
      const result = validateRotation(ids, lineup, players)
      expect(result.ok).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })
})
