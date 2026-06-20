export interface PlayerSeasonStats {
  playerId: string
  season: string
  teamId: string | null

  gamesPlayed: number
  minutes: number
  starts: number

  points: number
  rebounds: number
  offensiveRebounds: number
  defensiveRebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number

  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number

  tsPct: number
  efgPct: number
  per: number
  usageRate: number
  winShares: number
  boxPlusMinus: number
  vorp: number
}

export type RawPlayerSeasonStats = Omit<PlayerSeasonStats, 'playerId'> & {
  playerExternalId?: string
  playerId?: string
}

export function emptySeasonStats(
  playerId: string,
  season: string,
  teamId: string | null = null,
): PlayerSeasonStats {
  return {
    playerId,
    season,
    teamId,
    gamesPlayed: 0,
    minutes: 0,
    starts: 0,
    points: 0,
    rebounds: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    tsPct: 0,
    efgPct: 0,
    per: 0,
    usageRate: 0,
    winShares: 0,
    boxPlusMinus: 0,
    vorp: 0,
  }
}

export function perGame(stats: PlayerSeasonStats): {
  ppg: number
  rpg: number
  apg: number
  spg: number
  bpg: number
  mpg: number
  topg: number
} {
  const gp = Math.max(1, stats.gamesPlayed)
  return {
    ppg: stats.points / gp,
    rpg: stats.rebounds / gp,
    apg: stats.assists / gp,
    spg: stats.steals / gp,
    bpg: stats.blocks / gp,
    mpg: stats.minutes / gp,
    topg: stats.turnovers / gp,
  }
}

export function per36(
  stats: PlayerSeasonStats,
  kind: 'raw' | 'totals' = 'raw',
): number {
  const minutes = Math.max(1, stats.minutes)
  const factor = 36 / minutes
  if (kind === 'totals') {
    return factor
  }
  return factor
}
