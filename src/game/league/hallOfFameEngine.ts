import type { LeagueState } from '@/game/models/league'
import type { HallOfFameEntry } from '@/game/models/hallOfFame'
import type { Player } from '@/game/models/player'
import type { PlayerAccolades, PlayerCareerStats } from '@/game/models/playerCareerStats'

export function inductPlayers(
  seasonYear: number,
  league: LeagueState,
): HallOfFameEntry[] {
  const inductees: HallOfFameEntry[] = []

  const rosteredIds = new Set<string>()
  for (const team of Object.values(league.teams)) {
    for (const pid of team.roster) rosteredIds.add(pid)
  }

  for (const player of Object.values(league.players)) {
    if (rosteredIds.has(player.id)) continue
    if (player.careerStats.length === 0) continue

    const lastCareerSeason = player.careerStats.at(-1)
    if (lastCareerSeason) {
      const lastSeason = parseSeasonYear(lastCareerSeason.season)
      if (lastSeason > 0 && seasonYear - lastSeason < 4) continue
    }

    const eligible = checkEligibility(player, league)
    if (!eligible) continue

    if (league.hallOfFame.some((e) => e.playerId === player.id)) continue

    const accolades = deriveAccolades(player.id, league)
    const careerStats = buildCareerStats(player, accolades)

    const accoladesList = {
      awards: buildAccoladesList(careerStats),
      championships: accolades.champion,
      allStarSelections: accolades.allStar,
    }

    const votePercent = computeVotePercent(careerStats)

    inductees.push({
      id: `hof-${player.id}-${seasonYear}`,
      playerId: player.id,
      inductedSeason: seasonYear,
      careerStats,
      accolades: accoladesList,
      votePercent,
    })
  }

  return inductees
}

function buildCareerStats(player: Player, accolades: PlayerAccolades): PlayerCareerStats {
  const seasons = player.careerStats
  const totals = seasons.reduce(
    (acc, s) => {
      acc.gamesPlayed += s.gamesPlayed
      acc.minutes += s.minutes
      acc.points += s.points
      acc.rebounds += s.rebounds
      acc.assists += s.assists
      acc.steals += s.steals
      acc.blocks += s.blocks
      acc.turnovers += s.turnovers
      acc.fouls += 0
      acc.fgm += s.fieldGoalsMade
      acc.fga += s.fieldGoalsAttempted
      acc.tpm += s.threePointersMade
      acc.tpa += s.threePointersAttempted
      acc.ftm += s.freeThrowsMade
      acc.fta += s.freeThrowsAttempted
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

  const gp = Math.max(1, totals.gamesPlayed)
  const averages = {
    ppg: totals.points / gp,
    rpg: totals.rebounds / gp,
    apg: totals.assists / gp,
    spg: totals.steals / gp,
    bpg: totals.blocks / gp,
    mpg: totals.minutes / gp,
    topg: totals.turnovers / gp,
  }

  return {
    playerId: player.id,
    seasons: [],
    totals,
    averages,
    accolades,
  }
}

function deriveAccolades(playerId: string, league: LeagueState): PlayerAccolades {
  const accolades = {
    allStar: 0,
    allNba: 0,
    allDefense: 0,
    mvp: 0,
    finalsMvp: 0,
    champion: 0,
  }

  for (const season of league.awardsHistory) {
    for (const award of season.awards) {
      if (award.playerId !== playerId) continue
      switch (award.award) {
        case 'mvp': accolades.mvp++; break
        case 'finals_mvp': accolades.finalsMvp++; break
        case 'all_nba_1':
        case 'all_nba_2':
        case 'all_nba_3': accolades.allNba++; accolades.allStar++; break
        case 'all_defense_1':
        case 'all_defense_2': accolades.allDefense++; break
      }
    }
  }

  const playerSeasonTeams = new Map<string, string>()
  for (const s of league.players[playerId]?.careerStats ?? []) {
    if (s.teamId) playerSeasonTeams.set(s.season, s.teamId)
  }

  for (const champion of league.champions) {
    const teamId = playerSeasonTeams.get(champion.season)
    if (teamId === champion.championTeamId) {
      accolades.champion++
    }
  }

  return accolades
}

function parseSeasonYear(season: string): number {
  const m = season.match(/^(\d{4})/)
  return m ? Number(m[1]) : 0
}

function checkEligibility(player: Player, league: LeagueState): boolean {
  if (player.careerStats.length === 0) return false

  const totalPoints = player.careerStats.reduce((sum, s) => sum + s.points, 0)
  if (totalPoints > 15000) return true

  const accolades = deriveAccolades(player.id, league)
  if (accolades.mvp >= 1) return true
  if (accolades.champion >= 2) return true
  if (accolades.allStar >= 3) return true

  return false
}

function buildAccoladesList(cs: PlayerCareerStats): string[] {
  const list: string[] = []
  const a = cs.accolades
  if (a.mvp > 0) list.push(`${a.mvp}x MVP`)
  if (a.finalsMvp > 0) list.push(`${a.finalsMvp}x Finals MVP`)
  if (a.champion > 0) list.push(`${a.champion}x Champion`)
  if (a.allStar > 0) list.push(`${a.allStar}x All-Star`)
  if (a.allNba > 0) list.push(`${a.allNba}x All-NBA`)
  if (a.allDefense > 0) list.push(`${a.allDefense}x All-Defense`)
  if (cs.totals.gamesPlayed >= 820) list.push(`${Math.round(cs.totals.gamesPlayed / 82)} seasons played`)
  return list
}

function computeVotePercent(cs: PlayerCareerStats): number {
  let score = 0
  const a = cs.accolades

  score += a.mvp * 30
  score += a.finalsMvp * 20
  score += a.champion * 10
  score += a.allStar * 3
  score += a.allNba * 2
  score += a.allDefense * 1

  score += Math.floor(cs.totals.points / 500)

  return Math.min(100, Math.round(50 + score))
}
