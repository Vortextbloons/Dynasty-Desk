import type { TeamStanding } from '@/game/models/game'
import type { ScheduledGame } from '@/game/models/game'
import type { Team } from '@/game/models/team'

export function initializeStandings(
  teams: Team[],
  seasonLabel: string,
  totalGamesPerTeam: number,
): Record<string, TeamStanding> {
  const standings: Record<string, TeamStanding> = {}
  for (const team of teams) {
    standings[team.id] = {
      teamId: team.id,
      season: seasonLabel,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winPct: 0,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      conferenceRank: 0,
      divisionRank: 0,
      streak: 0,
      last10: '',
      clinchedPlayoff: false,
      clinchedDivision: false,
      eliminated: false,
      conferenceWins: 0,
      conferenceLosses: 0,
      divisionWins: 0,
      divisionLosses: 0,
      pointsPerGame: 0,
      pointsAllowedPerGame: 0,
      pointDifferentialPerGame: 0,
      gamesRemaining: totalGamesPerTeam,
      magicNumber: 0,
      tiebreaker: {
        headToHeadWins: 0,
        conferenceWinPct: 0,
        pointDifferential: 0,
      },
    }
  }
  return standings
}

export function recomputeStandings(
  games: Record<string, ScheduledGame>,
  teams: Record<string, Team>,
  seasonLabel: string,
  totalGamesPerTeam: number,
): Record<string, TeamStanding> {
  const teamIds = Object.keys(teams)
  const standings = initializeStandings(
    Object.values(teams).filter((t): t is NonNullable<typeof t> => Boolean(t)),
    seasonLabel,
    totalGamesPerTeam,
  )

  const teamGames = new Map<string, { wins: number; losses: number; results: ('W' | 'L')[] }>()
  for (const tid of teamIds) {
    teamGames.set(tid, { wins: 0, losses: 0, results: [] })
  }

  const finishedGames = Object.values(games)
    .filter((g): g is NonNullable<typeof g> => g?.status === 'final')
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  for (const game of finishedGames) {
    const home = standings[game.homeTeamId]
    const away = standings[game.awayTeamId]
    if (!home || !away) continue
    if (game.homeScore == null || game.awayScore == null) continue

    const homeWin = game.homeScore > game.awayScore
    const awayWin = game.awayScore > game.homeScore

    home.gamesPlayed++
    away.gamesPlayed++

    home.pointsFor += game.homeScore
    home.pointsAgainst += game.awayScore
    away.pointsFor += game.awayScore
    away.pointsAgainst += game.homeScore

    home.pointDifferential = home.pointsFor - home.pointsAgainst
    away.pointDifferential = away.pointsFor - away.pointsAgainst

    home.pointsPerGame = home.gamesPlayed > 0 ? home.pointsFor / home.gamesPlayed : 0
    home.pointsAllowedPerGame = home.gamesPlayed > 0 ? home.pointsAgainst / home.gamesPlayed : 0
    home.pointDifferentialPerGame = home.gamesPlayed > 0 ? home.pointDifferential / home.gamesPlayed : 0

    away.pointsPerGame = away.gamesPlayed > 0 ? away.pointsFor / away.gamesPlayed : 0
    away.pointsAllowedPerGame = away.gamesPlayed > 0 ? away.pointsAgainst / away.gamesPlayed : 0
    away.pointDifferentialPerGame = away.gamesPlayed > 0 ? away.pointDifferential / away.gamesPlayed : 0

    if (homeWin) {
      home.wins++
      home.homeWins++
      home.streak = home.streak >= 0 ? home.streak + 1 : 1
      away.losses++
      away.awayLosses++
      away.streak = away.streak <= 0 ? away.streak - 1 : -1

      const hg = teamGames.get(game.homeTeamId)
      const ag = teamGames.get(game.awayTeamId)
      if (hg) { hg.wins++; hg.results.push('W') }
      if (ag) { ag.losses++; ag.results.push('L') }
    } else if (awayWin) {
      home.losses++
      home.homeLosses++
      home.streak = home.streak <= 0 ? home.streak - 1 : -1
      away.wins++
      away.awayWins++
      away.streak = away.streak >= 0 ? away.streak + 1 : 1

      const hg = teamGames.get(game.homeTeamId)
      const ag = teamGames.get(game.awayTeamId)
      if (hg) { hg.losses++; hg.results.push('L') }
      if (ag) { ag.wins++; ag.results.push('W') }
    } else {
      home.losses++
      home.homeLosses++
      home.streak = home.streak <= 0 ? home.streak - 1 : -1
      away.losses++
      away.awayLosses++
      away.streak = away.streak <= 0 ? away.streak - 1 : -1

      const hg = teamGames.get(game.homeTeamId)
      const ag = teamGames.get(game.awayTeamId)
      if (hg) { hg.losses++; hg.results.push('L') }
      if (ag) { ag.losses++; ag.results.push('L') }
    }

    if (game.isConference) {
      if (homeWin) {
        home.conferenceWins++
        away.conferenceLosses++
      } else {
        home.conferenceLosses++
        away.conferenceWins++
      }
    }

    if (game.isDivision) {
      if (homeWin) {
        home.divisionWins++
        away.divisionLosses++
      } else {
        home.divisionLosses++
        away.divisionWins++
      }
    }
  }

  for (const [tid, data] of teamGames) {
    const s = standings[tid]
    if (!s) continue
    s.winPct = s.gamesPlayed > 0 ? s.wins / s.gamesPlayed : 0
    s.gamesRemaining = totalGamesPerTeam - s.gamesPlayed
    s.last10 = data.results.slice(-10).join('')

    const confGames = s.conferenceWins + s.conferenceLosses
    s.tiebreaker = {
      headToHeadWins: 0,
      conferenceWinPct: confGames > 0 ? s.conferenceWins / confGames : 0,
      pointDifferential: s.pointDifferential,
    }
  }

  assignConferenceRanks(standings, teams)
  computeMagicNumbers(standings, teams, totalGamesPerTeam)
  computeClinchAndElimination(standings, teams)

  return standings
}

function sortAndRank(
  standings: Record<string, TeamStanding>,
  teamIds: string[],
  rankField: 'conferenceRank' | 'divisionRank',
): void {
  teamIds.sort((a, b) => {
    const sa = standings[a]
    const sb = standings[b]
    if (!sa || !sb) return 0
    if (sb.wins !== sa.wins) return sb.wins - sa.wins
    if (sa.losses !== sb.losses) return sa.losses - sb.losses
    if (sa.tiebreaker.conferenceWinPct !== sb.tiebreaker.conferenceWinPct) {
      return sb.tiebreaker.conferenceWinPct - sa.tiebreaker.conferenceWinPct
    }
    return sb.pointDifferential - sa.pointDifferential
  })
  let rank = 1
  for (const tid of teamIds) {
    const s = standings[tid]
    if (s) s[rankField] = rank++
  }
}

function assignConferenceRanks(
  standings: Record<string, TeamStanding>,
  teams: Record<string, Team>,
): void {
  const conferences: Record<string, string[]> = { East: [], West: [] }
  for (const [tid, team] of Object.entries(teams)) {
    if (!team) continue
    conferences[team.conference]?.push(tid)
  }

  for (const teamIds of Object.values(conferences)) {
    sortAndRank(standings, teamIds, 'conferenceRank')
  }

  const divisions: Record<string, string[]> = {}
  for (const [tid, team] of Object.entries(teams)) {
    if (!team) continue
    const key = `${team.conference}-${team.division}`
    if (!divisions[key]) divisions[key] = []
    divisions[key]!.push(tid)
  }

  for (const teamIds of Object.values(divisions)) {
    sortAndRank(standings, teamIds, 'divisionRank')
  }
}

function computeMagicNumbers(
  standings: Record<string, TeamStanding>,
  teams: Record<string, Team>,
  totalGamesPerTeam: number,
): void {
  const conferences: Record<string, string[]> = { East: [], West: [] }
  for (const [tid, team] of Object.entries(teams)) {
    if (!team) continue
    conferences[team.conference]?.push(tid)
  }

  for (const teamIds of Object.values(conferences)) {
    const sorted = [...teamIds].sort((a, b) => {
      const sa = standings[a]
      const sb = standings[b]
      if (!sa || !sb) return 0
      return sb.wins - sa.wins || sa.losses - sb.losses
    })

    const playoffSpots = 8
    const firstOutTid = sorted.length > playoffSpots ? sorted[playoffSpots] : undefined
    const firstOut = firstOutTid ? standings[firstOutTid] : undefined

    for (const tid of sorted) {
      const s = standings[tid]
      if (!s) continue
      if (firstOut) {
        s.magicNumber = Math.max(0, totalGamesPerTeam - s.wins - firstOut.losses + 1)
      } else {
        s.magicNumber = 0
      }
    }
  }
}

function computeClinchAndElimination(
  standings: Record<string, TeamStanding>,
  teams: Record<string, Team>,
): void {
  const conferences: Record<string, string[]> = { East: [], West: [] }
  for (const [tid, team] of Object.entries(teams)) {
    if (!team) continue
    conferences[team.conference]?.push(tid)
  }

  for (const teamIds of Object.values(conferences)) {
    const sorted = [...teamIds].sort((a, b) => {
      const sa = standings[a]
      const sb = standings[b]
      if (!sa || !sb) return 0
      return sb.wins - sa.wins || sa.losses - sb.losses
    })

    const playoffSpots = 8

    for (let i = 0; i < sorted.length; i++) {
      const tid = sorted[i]
      if (!tid) continue
      const s = standings[tid]
      if (!s) continue

      if (i < playoffSpots) {
        const firstOutTid = sorted[playoffSpots]
        const firstOut = firstOutTid ? standings[firstOutTid] : undefined
        if (firstOut && s.wins > firstOut.wins + firstOut.gamesRemaining) {
          s.clinchedPlayoff = true
        }
      } else {
        const lastInTid = sorted[playoffSpots - 1]
        const lastIn = lastInTid ? standings[lastInTid] : undefined
        if (lastIn && s.wins + s.gamesRemaining < lastIn.wins) {
          s.eliminated = true
        }
      }
    }
  }

  const divisions: Record<string, string[]> = {}
  for (const [tid, team] of Object.entries(teams)) {
    if (!team) continue
    const key = `${team.conference}-${team.division}`
    if (!divisions[key]) divisions[key] = []
    divisions[key]!.push(tid)
  }

  for (const divTeamIds of Object.values(divisions)) {
    const divSorted = [...divTeamIds].sort((a, b) => {
      const sa = standings[a]
      const sb = standings[b]
      if (!sa || !sb) return 0
      return sb.wins - sa.wins || sa.losses - sb.losses
    })

    const leader = divSorted[0] ? standings[divSorted[0]] : undefined
    if (!leader) continue

    const secondPlace = divSorted[1] ? standings[divSorted[1]] : undefined
    if (secondPlace && leader.wins > secondPlace.wins + secondPlace.gamesRemaining) {
      leader.clinchedDivision = true
    }
  }
}

export function computeGB(
  leaderWins: number,
  leaderLosses: number,
  teamWins: number,
  teamLosses: number,
): string {
  const gb = (leaderWins - teamWins + teamLosses - leaderLosses) / 2
  if (gb === 0) return '—'
  return gb % 1 === 0 ? gb.toFixed(1) : gb.toFixed(1)
}

export function formatStreak(streak: number): string {
  if (streak === 0) return '—'
  const type = streak > 0 ? 'W' : 'L'
  return `${type}${Math.abs(streak)}`
}

export function formatLast10(last10: string): string {
  if (!last10) return '—'
  const wins = (last10.match(/W/g) ?? []).length
  const losses = (last10.match(/L/g) ?? []).length
  return `${wins}-${losses}`
}
