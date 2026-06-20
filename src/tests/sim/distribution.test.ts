import { describe, it, expect } from 'vitest'
import { simulateGame } from '@/game/sim/gameSimulator'
import { buildBoxScore } from '@/game/sim/boxScoreBuilder'
import { SeededRandom } from '@/game/sim/rng'
import { createRngState } from '@/game/core/seededRandom'
import { makePlayer, makeTeam } from '@/tests/sim/fixtures'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { MODERN_ERA_CONFIG } from '@/game/models/eraConfig'

const RUN_SLOW = process.env.RUN_SLOW_TESTS === '1'

function buildRoster(teamId: string, count: number, stars: number) {
  const players = []
  for (let i = 0; i < count; i++) {
    const isStar = i < stars
    players.push(
      makePlayer({
        id: `${teamId}-p${i + 1}`,
        teamId,
        position: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5]!,
        ratings: {
          insideScoring: isStar ? 90 : 60,
          closeShot: isStar ? 88 : 60,
          midrange: isStar ? 85 : 60,
          threePoint: isStar ? 88 : 65,
          freeThrow: isStar ? 88 : 70,
          ballHandling: isStar ? 90 : 55,
          passing: isStar ? 90 : 55,
          offensiveIq: isStar ? 90 : 60,
          offensiveRebound: 50,
          defensiveRebound: 60,
          perimeterDefense: isStar ? 88 : 60,
          interiorDefense: 70,
          steal: 60,
          block: 60,
          defensiveIq: isStar ? 85 : 60,
          speed: 80,
          strength: 75,
          vertical: 70,
          stamina: 80,
          durability: 80,
          clutch: 80,
          consistency: 80,
          potential: 80,
          overall: isStar ? 92 : 65,
        },
        tendencies: {
          usageRate: isStar ? 30 : 15,
          passRate: isStar ? 30 : 15,
          shotRate: 25,
          driveRate: 20,
          postUpRate: 10,
          rimFrequency: 30,
          shortMidFrequency: 15,
          longMidFrequency: 10,
          cornerThreeFrequency: 10,
          aboveBreakThreeFrequency: 30,
          threePointRate: isStar ? 35 : 28,
          freeThrowRate: 30,
          turnoverRate: 12,
          isolationRate: 15,
          pickAndRollBallHandlerRate: 25,
          pickAndRollRollManRate: 10,
          spotUpRate: 20,
          transitionRate: 15,
          cutRate: 10,
          foulRate: 4,
          stealAttemptRate: 5,
          blockAttemptRate: 5,
          crashOffensiveGlassRate: 10,
        },
      }),
    )
  }
  return players
}

function setup(homeId: string, awayId: string, homeStars: number, awayStars: number) {
  const home = makeTeam({ id: homeId })
  const away = makeTeam({ id: awayId })
  const homePlayers = buildRoster(homeId, 10, homeStars)
  const awayPlayers = buildRoster(awayId, 10, awayStars)
  const tm = (players: typeof homePlayers) => {
    const out: Record<string, number> = {}
    for (const p of players) {
      const isStar = p.id.endsWith('-p1') || p.id.endsWith('-p2')
      out[p.id] = isStar ? 36 : 24
    }
    return out
  }
  const homeIds = homePlayers.slice(0, 5).map((p) => p.id)
  const awayIds = awayPlayers.slice(0, 5).map((p) => p.id)
  home.lineup = {
    starters: homeIds,
    bench: homePlayers.slice(5).map((p) => p.id),
    closingLineup: homeIds,
    targetMinutes: tm(homePlayers),
    autoRotation: false,
  }
  away.lineup = {
    starters: awayIds,
    bench: awayPlayers.slice(5).map((p) => p.id),
    closingLineup: awayIds,
    targetMinutes: tm(awayPlayers),
    autoRotation: false,
  }
  return { home, away, homePlayers, awayPlayers }
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

describe('distribution test', () => {
  it.skipIf(!RUN_SLOW)(
    '1,000 games pass calibration',
    async () => {
      const N = 1000
      const teamScores: number[] = []
      const possessions: number[] = []
      const threes: number[] = []
      const fts: number[] = []
      const tovs: number[] = []
      const homeWins: number[] = []
      const starUsages: number[] = []

      for (let i = 0; i < N; i++) {
        const { home, away, homePlayers, awayPlayers } = setup(`h${i}`, `a${i}`, 2, 2)
        const rng = new SeededRandom(createRngState(`dist-${i}`))
        const { gameState, keyPlays } = await simulateGame({
          id: `g${i}`,
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
          simSpeed: 'instant',
        })
        const box = buildBoxScore({ gameState, keyPlays })
        teamScores.push(box.homeScore, box.awayScore)
        possessions.push(
          box.teamStats.home.fga + box.teamStats.home.turnovers + box.teamStats.home.fta * 0.44,
          box.teamStats.away.fga + box.teamStats.away.turnovers + box.teamStats.away.fta * 0.44,
        )
        threes.push(box.teamStats.home.tpa, box.teamStats.away.tpa)
        fts.push(box.teamStats.home.fta, box.teamStats.away.fta)
        tovs.push(box.teamStats.home.turnovers, box.teamStats.away.turnovers)
        homeWins.push(box.homeWin ? 1 : 0)
        const star1 = box.playerStats[homePlayers[0]!.id]
        const star2 = box.playerStats[awayPlayers[0]!.id]
        if (star1) starUsages.push(star1.fga / Math.max(1, box.teamStats.home.fga))
        if (star2) starUsages.push(star2.fga / Math.max(1, box.teamStats.away.fga))
      }

      expect(avg(teamScores)).toBeGreaterThan(95)
      expect(avg(teamScores)).toBeLessThan(125)
      expect(avg(possessions)).toBeGreaterThan(85)
      expect(avg(possessions)).toBeLessThan(110)
      expect(avg(threes)).toBeGreaterThan(25)
      expect(avg(threes)).toBeLessThan(50)
      expect(avg(fts)).toBeGreaterThan(14)
      expect(avg(fts)).toBeLessThan(30)
      expect(avg(tovs)).toBeGreaterThan(8)
      expect(avg(tovs)).toBeLessThan(20)
      const homeWinRate = avg(homeWins)
      expect(homeWinRate).toBeGreaterThan(0.48)
      expect(homeWinRate).toBeLessThan(0.68)
      const starUsage = avg(starUsages)
      expect(starUsage).toBeGreaterThan(0.18)
    },
    600_000,
  )
})
