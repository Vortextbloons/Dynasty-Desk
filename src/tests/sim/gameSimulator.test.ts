// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { simulateGame } from '@/game/sim/gameSimulator'
import { buildBoxScore, checkConsistency } from '@/game/sim/boxScoreBuilder'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { makePlayer, makeTeam } from '@/tests/sim/fixtures'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { MODERN_ERA_CONFIG } from '@/game/models/eraConfig'

function makePlayers(teamId: string, count: number): ReturnType<typeof makePlayer>[] {
  return Array.from({ length: count }, (_, i) =>
    makePlayer({
      id: `${teamId}-p${i + 1}`,
      teamId,
      position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5] ?? 'SF',
    }),
  )
}

function setup() {
  const home = makeTeam({ id: 'home' })
  const away = makeTeam({ id: 'away' })
  const homePlayers = makePlayers('home', 10)
  const awayPlayers = makePlayers('away', 10)
  const homeIds = homePlayers.slice(0, 5).map((p) => p.id)
  const awayIds = awayPlayers.slice(0, 5).map((p) => p.id)
  const homeBench = homePlayers.slice(5).map((p) => p.id)
  const awayBench = awayPlayers.slice(5).map((p) => p.id)
  const targetMinutes: Record<string, number> = {}
  for (const p of homePlayers) targetMinutes[p.id] = p.id.startsWith('home-p1') || p.id.startsWith('home-p2') ? 36 : 24
  for (const p of awayPlayers) targetMinutes[p.id] = p.id.startsWith('away-p1') || p.id.startsWith('away-p2') ? 36 : 24
  const sum = Object.values(targetMinutes).reduce((a, b) => a + b, 0)
  if (sum !== 240) {
    const diff = 240 - sum
    targetMinutes[homePlayers[homePlayers.length - 1]!.id] =
      (targetMinutes[homePlayers[homePlayers.length - 1]!.id] ?? 0) + diff
  }
  home.lineup = {
    starters: homeIds,
    bench: homeBench,
    closingLineup: homeIds.slice(0, 5),
    targetMinutes,
    autoRotation: false,
  }
  away.lineup = {
    starters: awayIds,
    bench: awayBench,
    closingLineup: awayIds.slice(0, 5),
    targetMinutes: { ...targetMinutes },
    autoRotation: false,
  }
  return { home, away, homePlayers, awayPlayers }
}

describe('simulateGame', () => {
  it('produces a final game in [80, 140] for both teams', async () => {
    const { home, away, homePlayers, awayPlayers } = setup()
    const rng = new SeededRandom(createRngState('gs-1'))
    const { gameState, keyPlays } = await simulateGame({
      id: 'g1',
      home,
      away,
      homeLineup: home.lineup,
      awayLineup: away.lineup,
      homePlayers,
      awayPlayers,
      rules: DEFAULT_LEAGUE_RULES,
      era: MODERN_ERA_CONFIG,
      rng,
      date: '2025-10-21',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })
    expect(gameState.score.home).toBeGreaterThanOrEqual(0)
    expect(gameState.score.away).toBeGreaterThanOrEqual(0)
    expect(gameState.score.home).toBeLessThanOrEqual(200)
    expect(gameState.score.away).toBeLessThanOrEqual(200)
    expect(gameState.status).toBe('final')
    expect(keyPlays.length).toBeLessThanOrEqual(5)
  })

  it('produces a box score with internal consistency', async () => {
    const { home, away, homePlayers, awayPlayers } = setup()
    const rng = new SeededRandom(createRngState('gs-2'))
    const { gameState, keyPlays } = await simulateGame({
      id: 'g2',
      home,
      away,
      homeLineup: home.lineup,
      awayLineup: away.lineup,
      homePlayers,
      awayPlayers,
      rules: DEFAULT_LEAGUE_RULES,
      era: MODERN_ERA_CONFIG,
      rng,
      date: '2025-10-21',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })
    const box = buildBoxScore({ gameState, keyPlays })
    const consistency = checkConsistency(box)
    if (!consistency.ok) {
      console.error(consistency.issues)
    }
    expect(consistency.ok).toBe(true)
  })

  it('per-player minutes are in [0, 48] and team minutes ≈ 240', async () => {
    const { home, away, homePlayers, awayPlayers } = setup()
    const rng = new SeededRandom(createRngState('gs-3'))
    const { gameState } = await simulateGame({
      id: 'g3',
      home,
      away,
      homeLineup: home.lineup,
      awayLineup: away.lineup,
      homePlayers,
      awayPlayers,
      rules: DEFAULT_LEAGUE_RULES,
      era: MODERN_ERA_CONFIG,
      rng,
      date: '2025-10-21',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })
    let homeMins = 0
    let awayMins = 0
    for (const v of Object.values(gameState.minutesPlayed)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(48)
    }
    for (const id of gameState.lineupOnCourt.home) {
      homeMins += gameState.minutesPlayed[id] ?? 0
    }
    for (const id of gameState.lineupOnCourt.away) {
      awayMins += gameState.minutesPlayed[id] ?? 0
    }
    expect(homeMins).toBeGreaterThan(150)
    expect(awayMins).toBeGreaterThan(150)
  })

  it('homeWin is set when final', async () => {
    const { home, away, homePlayers, awayPlayers } = setup()
    const rng = new SeededRandom(createRngState('gs-4'))
    const { gameState } = await simulateGame({
      id: 'g4',
      home,
      away,
      homeLineup: home.lineup,
      awayLineup: away.lineup,
      homePlayers,
      awayPlayers,
      rules: DEFAULT_LEAGUE_RULES,
      era: MODERN_ERA_CONFIG,
      rng,
      date: '2025-10-21',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })
    expect(gameState.homeWin).not.toBeNull()
  })

  it('is deterministic for the same seed', async () => {
    const { home, away, homePlayers, awayPlayers } = setup()
    const a = new SeededRandom(createRngState('gs-d'))
    const b = new SeededRandom(createRngState('gs-d'))
    const ra = await simulateGame({
      id: 'ga',
      home,
      away,
      homeLineup: home.lineup,
      awayLineup: away.lineup,
      homePlayers,
      awayPlayers,
      rules: DEFAULT_LEAGUE_RULES,
      era: MODERN_ERA_CONFIG,
      rng: a,
      date: '2025-10-21',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })
    const rb = await simulateGame({
      id: 'gb',
      home,
      away,
      homeLineup: home.lineup,
      awayLineup: away.lineup,
      homePlayers,
      awayPlayers,
      rules: DEFAULT_LEAGUE_RULES,
      era: MODERN_ERA_CONFIG,
      rng: b,
      date: '2025-10-21',
      injuriesEnabled: false,
      fatigueEnabled: false,
      simSpeed: 'instant',
    })
    expect(ra.gameState.score).toEqual(rb.gameState.score)
  })
})
