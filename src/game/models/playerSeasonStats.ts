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
