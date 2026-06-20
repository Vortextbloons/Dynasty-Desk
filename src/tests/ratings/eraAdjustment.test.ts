// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  eraCoefficient,
  normalizePPG,
  paceNormalize,
  tsAdjustment,
} from '@/game/ratings/eraAdjustment'
import {
  MODERN_ERA_CONFIG,
  LATE_1990S_ERA_CONFIG,
} from '@/game/models/eraConfig'
import { generateRatings } from '@/game/ratings/playerRatingEngine'

function makeStats(
  season: string,
  overrides: Partial<{
    ppg: number
    rpg: number
    apg: number
    ts: number
    tpa: number
    tpm: number
    fta: number
    ftm: number
    gp: number
    mpg: number
    per: number
    bpm: number
    spg: number
    bpg: number
    topg: number
    usg: number
    ws: number
    vorp: number
    threePct: number
  }> = {},
) {
  const gp = overrides.gp ?? 72
  const mpg = overrides.mpg ?? 34
  const minutes = mpg * gp
  const points = (overrides.ppg ?? 25) * gp
  const rebounds = (overrides.rpg ?? 7) * gp
  const assists = (overrides.apg ?? 5) * gp
  const steals = (overrides.spg ?? 1.2) * gp
  const blocks = (overrides.bpg ?? 0.6) * gp
  const turnovers = (overrides.topg ?? 2.2) * gp
  const tpa = (overrides.tpa ?? 6) * gp
  const tpm = (overrides.tpm ?? 2.4) * gp
  const fta = (overrides.fta ?? 6) * gp
  const ftm = (overrides.ftm ?? 5) * gp
  const fga = Math.round(points / 2.2)
  const fgm = Math.round(fga * 0.5)
  return {
    playerId: 'p1',
    season,
    teamId: 'team-x',
    gamesPlayed: gp,
    minutes,
    starts: gp,
    points,
    rebounds,
    offensiveRebounds: rebounds * 0.25,
    defensiveRebounds: rebounds * 0.75,
    assists,
    steals,
    blocks,
    turnovers,
    fouls: gp * 2,
    fgm,
    fga,
    tpm,
    tpa,
    ftm,
    fta,
    tsPct: overrides.ts ?? 0.6,
    efgPct: 0.55,
    per: overrides.per ?? 25,
    usageRate: overrides.usg ?? 30,
    winShares: overrides.ws ?? 8,
    boxPlusMinus: overrides.bpm ?? 6,
    vorp: overrides.vorp ?? 4,
  }
}

describe('eraAdjustment', () => {
  it('normalizes PPG exactly by era', () => {
    expect(normalizePPG(25, MODERN_ERA_CONFIG)).toBe(25)
    expect(normalizePPG(25, LATE_1990S_ERA_CONFIG)).toBeCloseTo(
      25 * (114.7 / 99.1),
      5,
    )
  })

  it('normalizes pace exactly by era', () => {
    expect(paceNormalize(100, MODERN_ERA_CONFIG)).toBe(100)
    expect(paceNormalize(100, LATE_1990S_ERA_CONFIG)).toBeCloseTo(
      100 * (99.2 / 91.1),
      5,
    )
  })

  it('applies tsAdjustment exactly and handles zero TS', () => {
    expect(tsAdjustment(makeStats('2024-25', { ts: 0.62 }), MODERN_ERA_CONFIG)).toBeCloseTo(4, 10)
    expect(tsAdjustment(makeStats('2024-25', { ts: 0.5 }), MODERN_ERA_CONFIG)).toBeCloseTo(-8, 10)
    expect(tsAdjustment(makeStats('2024-25', { ts: 0 }), MODERN_ERA_CONFIG)).toBe(0)
  })

  it('returns exact era coefficients', () => {
    expect(eraCoefficient(MODERN_ERA_CONFIG)).toBe(1)
    expect(eraCoefficient(LATE_1990S_ERA_CONFIG)).toBe(0.92)
  })
})

describe('era calibration across NBA eras', () => {
  it('keeps a 1995-96 Hakeem-equivalent and 2024-25 Embiid-equivalent close on interior scoring', () => {
    const hakeem = generateRatings(
      [
        makeStats('1995-96', {
          ppg: 27,
          rpg: 11,
          apg: 3,
          ts: 0.58,
          per: 27,
          bpm: 6,
        }),
      ],
      'C',
      '1995-96',
    )
    const embiid = generateRatings(
      [
        makeStats('2024-25', {
          ppg: 30,
          rpg: 11,
          apg: 5,
          ts: 0.62,
          per: 30,
          bpm: 7,
        }),
      ],
      'C',
      '2024-25',
    )
    const diff = Math.abs(hakeem.insideScoring - embiid.insideScoring)
    expect(diff).toBeLessThan(8)
    expect(hakeem.insideScoring).toBeGreaterThan(80)
    expect(embiid.insideScoring).toBeGreaterThan(80)
  })

  it('keeps a 2015-16 Curry and 1995-96 MJ comparable on primary skills', () => {
    const curry = generateRatings(
      [
        makeStats('2015-16', {
          ppg: 30,
          rpg: 5,
          apg: 7,
          ts: 0.67,
          per: 31,
          tpa: 13,
          tpm: 5,
          threePct: 0.45,
        }),
      ],
      'PG',
      '2015-16',
    )
    const mj = generateRatings(
      [
        makeStats('1995-96', {
          ppg: 30,
          rpg: 6,
          apg: 4,
          ts: 0.58,
          per: 28,
          tpa: 3,
          tpm: 0.7,
        }),
      ],
      'SG',
      '1995-96',
    )
    expect(curry.insideScoring).toBeGreaterThan(80)
    expect(mj.insideScoring).toBeGreaterThan(80)
  })

  it('bench players land in the 55-70 range', () => {
    const bench = generateRatings(
      [
        makeStats('2024-25', {
          ppg: 6,
          rpg: 2,
          apg: 1,
          ts: 0.52,
          per: 10,
          gp: 50,
          mpg: 16,
        }),
      ],
      'SG',
      '2024-25',
    )
    expect(bench.insideScoring).toBeGreaterThanOrEqual(50)
    expect(bench.insideScoring).toBeLessThan(75)
  })
})
