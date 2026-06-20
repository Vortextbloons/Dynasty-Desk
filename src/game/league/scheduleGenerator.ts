import type { ScheduledGame } from '@/game/models/game'
import type { Team } from '@/game/models/team'
import type { SeededRandom } from '@/game/sim/rng'
import {
  SEASON_LENGTH_DAYS,
  MIN_DAYS_BETWEEN_SAME_OPPONENT,
} from './scheduleConstants'
import { addDays } from '@/lib/utils'

export interface ScheduleOptions {
  startDate: string
  seasonYear: number
  seasonLabel: string
  rng: SeededRandom
}

interface Matchup {
  teamA: string
  teamB: string
  games: number
  isConference: boolean
  isDivision: boolean
}

function buildMatchups(teams: Team[]): Matchup[] {
  const matchups: Matchup[] = []

  const byConfDiv: Record<string, Team[]> = {}
  for (const team of teams) {
    const key = `${team.conference}-${team.division}`
    if (!byConfDiv[key]) byConfDiv[key] = []
    byConfDiv[key]!.push(team)
  }

  const byConf: Record<string, Team[]> = {}
  for (const team of teams) {
    if (!byConf[team.conference]) byConf[team.conference] = []
    byConf[team.conference]!.push(team)
  }

  for (const confTeams of Object.values(byConf)) {
    const divTeams: Team[][] = []
    const divNames: string[] = []
    const seenDivs = new Set<string>()
    for (const t of confTeams) {
      if (!seenDivs.has(t.division)) {
        seenDivs.add(t.division)
        divNames.push(t.division)
      }
    }
    for (const divName of divNames) {
      divTeams.push(confTeams.filter((t) => t.division === divName))
    }

    for (let d = 0; d < divTeams.length; d++) {
      const divA = divTeams[d]!
      for (let e = d; e < divTeams.length; e++) {
        const divB = divTeams[e]!
        const sameDiv = d === e

        for (let i = 0; i < divA.length; i++) {
          const startJ = sameDiv ? i + 1 : 0
          for (let j = startJ; j < divB.length; j++) {
            const a = divA[i]!
            const b = divB[j]!
            let games: number
            if (sameDiv) {
              games = 4
            } else {
              games = (i + j) % 5 < 3 ? 4 : 3
            }
            matchups.push({
              teamA: a.id,
              teamB: b.id,
              games,
              isConference: true,
              isDivision: sameDiv,
            })
          }
        }
      }
    }
  }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i]!
      const b = teams[j]!
      if (a.conference === b.conference) continue
      matchups.push({
        teamA: a.id,
        teamB: b.id,
        games: 2,
        isConference: false,
        isDivision: false,
      })
    }
  }

  return matchups
}

function assignHomeAway(
  matchup: Matchup,
  games: number,
): { homeTeamId: string; awayTeamId: string }[] {
  const result: { homeTeamId: string; awayTeamId: string }[] = []
  const half = Math.floor(games / 2)
  const extra = games % 2

  for (let i = 0; i < half; i++) {
    result.push({ homeTeamId: matchup.teamA, awayTeamId: matchup.teamB })
    result.push({ homeTeamId: matchup.teamB, awayTeamId: matchup.teamA })
  }
  if (extra) {
    result.push({ homeTeamId: matchup.teamA, awayTeamId: matchup.teamB })
  }
  return result
}

function distributeAcrossSeason(
  allMatchups: { matchup: Matchup; pair: { homeTeamId: string; awayTeamId: string } }[],
  startDate: string,
  seasonYear: number,
  seasonLabel: string,
  teamIds: string[],
  rng: SeededRandom,
): ScheduledGame[] {
  const teamDateMap = new Map<string, Set<string>>()
  const teamOpponentDateMap = new Map<string, Map<string, Set<string>>>()
  for (const tid of teamIds) {
    teamDateMap.set(tid, new Set())
    teamOpponentDateMap.set(tid, new Map())
  }

  const days: { date: string; games: ScheduledGame[] }[] = []
  for (let d = 0; d < SEASON_LENGTH_DAYS; d++) {
    days.push({ date: addDays(startDate, d), games: [] })
  }

  const shuffledMatchups = [...allMatchups]
  for (let i = shuffledMatchups.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    ;[shuffledMatchups[i], shuffledMatchups[j]] = [shuffledMatchups[j]!, shuffledMatchups[i]!]
  }

  const gamesById = new Map<string, ScheduledGame>()

  function canPlayOnDate(
    homeTeamId: string,
    awayTeamId: string,
    date: string,
  ): boolean {
    const homeDates = teamDateMap.get(homeTeamId)
    const awayDates = teamDateMap.get(awayTeamId)
    if (!homeDates || !awayDates) return false
    if (homeDates.has(date) || awayDates.has(date)) return false

    const homeOppDates = teamOpponentDateMap.get(homeTeamId)
    const awayOppDates = teamOpponentDateMap.get(awayTeamId)
    if (homeOppDates) {
      const homeVsAway = homeOppDates.get(awayTeamId)
      if (homeVsAway) {
        for (const d of homeVsAway) {
          const diff = Math.abs(
            new Date(date).getTime() - new Date(d).getTime(),
          ) / (1000 * 60 * 60 * 24)
          if (diff < MIN_DAYS_BETWEEN_SAME_OPPONENT) return false
        }
      }
    }
    if (awayOppDates) {
      const awayVsHome = awayOppDates.get(homeTeamId)
      if (awayVsHome) {
        for (const d of awayVsHome) {
          const diff = Math.abs(
            new Date(date).getTime() - new Date(d).getTime(),
          ) / (1000 * 60 * 60 * 24)
          if (diff < MIN_DAYS_BETWEEN_SAME_OPPONENT) return false
        }
      }
    }
    return true
  }

  function recordGame(
    homeTeamId: string,
    awayTeamId: string,
    date: string,
    isConference: boolean,
    isDivision: boolean,
    gameIndex: number,
  ): ScheduledGame {
    const id = `${homeTeamId}-${awayTeamId}-${date}-${gameIndex}`
    const game: ScheduledGame = {
      id,
      season: seasonLabel,
      date,
      homeTeamId,
      awayTeamId,
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      boxScoreId: null,
      boxScore: null,
      isConference,
      isDivision,
      seasonYear,
      isUserTeamGame: false,
    }
    gamesById.set(id, game)

    teamDateMap.get(homeTeamId)!.add(date)
    teamDateMap.get(awayTeamId)!.add(date)

    const homeOpp = teamOpponentDateMap.get(homeTeamId)!
    if (!homeOpp.has(awayTeamId)) homeOpp.set(awayTeamId, new Set())
    homeOpp.get(awayTeamId)!.add(date)

    const awayOpp = teamOpponentDateMap.get(awayTeamId)!
    if (!awayOpp.has(homeTeamId)) awayOpp.set(homeTeamId, new Set())
    awayOpp.get(homeTeamId)!.add(date)

    return game
  }

  for (const { matchup, pair } of shuffledMatchups) {
    let placed = false
    for (let d = 0; d < days.length && !placed; d++) {
      const slot = days[d]!
      if (canPlayOnDate(pair.homeTeamId, pair.awayTeamId, slot.date)) {
        const game = recordGame(
          pair.homeTeamId,
          pair.awayTeamId,
          slot.date,
          matchup.isConference,
          matchup.isDivision,
          slot.games.length,
        )
        slot.games.push(game)
        placed = true
      }
    }
  }

  return Array.from(gamesById.values())
}

export function generateSchedule(
  teams: Team[],
  options: ScheduleOptions,
): ScheduledGame[] {
  const teamIds = teams.map((t) => t.id)
  const matchups = buildMatchups(teams)

  const allPairs: { matchup: Matchup; pair: { homeTeamId: string; awayTeamId: string } }[] = []
  for (const matchup of matchups) {
    const pairs = assignHomeAway(matchup, matchup.games)
    for (const pair of pairs) {
      allPairs.push({ matchup, pair })
    }
  }

  return distributeAcrossSeason(
    allPairs,
    options.startDate,
    options.seasonYear,
    options.seasonLabel,
    teamIds,
    options.rng,
  )
}
