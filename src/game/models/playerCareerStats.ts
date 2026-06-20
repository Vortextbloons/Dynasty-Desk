import { perGame, type PlayerSeasonStats } from './playerSeasonStats'

export interface PlayerAccolades {
  allStar: number
  allNba: number
  allDefense: number
  mvp: number
  finalsMvp: number
  champion: number
}

export function emptyAccolades(): PlayerAccolades {
  return {
    allStar: 0,
    allNba: 0,
    allDefense: 0,
    mvp: 0,
    finalsMvp: 0,
    champion: 0,
  }
}

export interface PlayerCareerStats {
  playerId: string
  seasons: PlayerSeasonStats[]
  totals: {
    gamesPlayed: number
    minutes: number
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
  }
  averages: {
    ppg: number
    rpg: number
    apg: number
    spg: number
    bpg: number
    mpg: number
    topg: number
  }
  accolades: PlayerAccolades
}

export function computeCareerStats(
  playerId: string,
  seasons: PlayerSeasonStats[],
  accolades: PlayerAccolades = emptyAccolades(),
): PlayerCareerStats {
  const totals = seasons.reduce(
    (acc, s) => {
      acc.gamesPlayed += s.gamesPlayed
      acc.minutes += s.minutes
      acc.points += s.points
      acc.offensiveRebounds += s.offensiveRebounds
      acc.defensiveRebounds += s.defensiveRebounds
      acc.rebounds += s.rebounds
      acc.assists += s.assists
      acc.steals += s.steals
      acc.blocks += s.blocks
      acc.turnovers += s.turnovers
      acc.fouls += s.fouls
      acc.fgm += s.fgm
      acc.fga += s.fga
      acc.tpm += s.tpm
      acc.tpa += s.tpa
      acc.ftm += s.ftm
      acc.fta += s.fta
      return acc
    },
    {
      gamesPlayed: 0,
      minutes: 0,
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
    },
  )

  const sortedSeasons = [...seasons].sort((a, b) =>
    a.season.localeCompare(b.season),
  )
  const blended = perGame(careerTotalsToSeasonStats(totals))

  return {
    playerId,
    seasons: sortedSeasons,
    totals,
    averages: blended,
    accolades,
  }
}

function careerTotalsToSeasonStats(
  totals: PlayerCareerStats['totals'],
): PlayerSeasonStats {
  return {
    playerId: '',
    season: '',
    teamId: null,
    gamesPlayed: totals.gamesPlayed,
    minutes: totals.minutes,
    starts: 0,
    points: totals.points,
    rebounds: totals.rebounds,
    offensiveRebounds: totals.offensiveRebounds,
    defensiveRebounds: totals.defensiveRebounds,
    assists: totals.assists,
    steals: totals.steals,
    blocks: totals.blocks,
    turnovers: totals.turnovers,
    fouls: totals.fouls,
    fgm: totals.fgm,
    fga: totals.fga,
    tpm: totals.tpm,
    tpa: totals.tpa,
    ftm: totals.ftm,
    fta: totals.fta,
    tsPct: 0,
    efgPct: 0,
    per: 0,
    usageRate: 0,
    winShares: 0,
    boxPlusMinus: 0,
    vorp: 0,
  }
}
