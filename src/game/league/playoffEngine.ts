import type { LeagueState, TeamSeasonResult } from '@/game/models/league'
import type { ScheduledGame, TeamStanding } from '@/game/models/game'
import type {
  PlayoffBracket,
  PlayoffSeries,
  PlayInGame,
  PlayInBracket,
} from '@/game/models/playoff'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { Team } from '@/game/models/team'
import type { BoxScoreResult } from '@/game/models/sim'
import type { SeededRandom } from '@/game/sim/rng'
import { addDays } from '@/lib/utils'
import {
  createSimSessionState,
  simulateAndFinalizeGame,
  type FinalizationTarget,
  type SimSessionState,
} from '@/game/league/gameFinalization'

export interface PostseasonSimOptions {
  injuriesEnabled?: boolean
  fatigueEnabled?: boolean
}

export interface PlayoffGameResult {
  gameId: string
  seriesId: string
  gameNumber: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  winnerTeamId: string
}

export interface AdvancePlayoffResult {
  gamesSimulated: number
  results: PlayoffGameResult[]
  seriesCompleted: string[]
  bracketComplete: boolean
}

function getPlayersForTeam(team: Team, league: LeagueState) {
  return team.roster
    .map((id) => league.players[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
}

function finalizationTarget(
  league: LeagueState,
  options?: PostseasonSimOptions,
): FinalizationTarget {
  return {
    league,
    settings: {
      injuries: options?.injuriesEnabled ?? true,
      fatigue: options?.fatigueEnabled ?? true,
    },
  }
}

async function runScheduledPlayoffGame(
  league: LeagueState,
  game: ScheduledGame,
  rng: SeededRandom,
  session: SimSessionState,
  options?: PostseasonSimOptions,
): Promise<BoxScoreResult | null> {
  const result = await simulateAndFinalizeGame(
    finalizationTarget(league, options),
    game,
    rng,
    session,
    'instant',
  )
  if (!result) return null
  league.news.push(...result.post.news)
  return result.boxScore
}

function getRequiredWins(seriesLength: 1 | 3 | 5 | 7): number {
  return Math.ceil(seriesLength / 2)
}

function getHomeTeamForGame(
  _series: PlayoffSeries,
  gameNumber: number,
): 'higher' | 'lower' {
  const pattern = [1, 1, 0, 0, 1, 0, 1]
  const idx = (gameNumber - 1) % pattern.length
  return pattern[idx] === 1 ? 'higher' : 'lower'
}

function getTeamHomeId(
  series: PlayoffSeries,
  gameNumber: number,
): string {
  return getHomeTeamForGame(series, gameNumber) === 'higher'
    ? series.higherSeedTeamId
    : series.lowerSeedTeamId
}

function getTeamAwayId(
  series: PlayoffSeries,
  gameNumber: number,
): string {
  return getHomeTeamForGame(series, gameNumber) === 'higher'
    ? series.lowerSeedTeamId
    : series.higherSeedTeamId
}

function createPlayoffGame(
  series: PlayoffSeries,
  gameNumber: number,
  date: string,
  seasonYear: number,
  season: string,
  userTeamId: string,
): ScheduledGame {
  const homeTeamId = getTeamHomeId(series, gameNumber)
  const awayTeamId = getTeamAwayId(series, gameNumber)

  return {
    id: `${series.id}-g${gameNumber}`,
    season,
    date,
    homeTeamId,
    awayTeamId,
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
    boxScoreId: null,
    isConference: series.conference !== 'Finals',
    isDivision: false,
    seasonYear,
    isUserTeamGame: homeTeamId === userTeamId || awayTeamId === userTeamId,
    playoffSeriesId: series.id,
    playoffRound: series.round,
    playoffGameNumber: gameNumber,
  }
}

function getSeedsByConference(
  standings: Record<string, TeamStanding>,
  teams: Record<string, Team>,
  conference: 'East' | 'West',
  count: number,
): { teamId: string; seed: number; standing: TeamStanding }[] {
  return Object.values(standings)
    .filter((s) => {
      const team = teams[s.teamId]
      return team?.conference === conference
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (a.losses !== b.losses) return a.losses - b.losses
      const aConfPct = a.conferenceWins + a.conferenceLosses > 0
        ? a.conferenceWins / (a.conferenceWins + a.conferenceLosses)
        : 0
      const bConfPct = b.conferenceWins + b.conferenceLosses > 0
        ? b.conferenceWins / (b.conferenceWins + b.conferenceLosses)
        : 0
      if (bConfPct !== aConfPct) return bConfPct - aConfPct
      return b.pointDifferential - a.pointDifferential
    })
    .slice(0, count)
    .map((s, i) => ({ teamId: s.teamId, seed: i + 1, standing: s }))
}

function createFirstRoundMatchups(
  seeds: { teamId: string; seed: number }[],
): { higher: { teamId: string; seed: number }; lower: { teamId: string; seed: number } }[] {
  return [
    { higher: seeds[0]!, lower: seeds[7]! },
    { higher: seeds[3]!, lower: seeds[4]! },
    { higher: seeds[2]!, lower: seeds[5]! },
    { higher: seeds[1]!, lower: seeds[6]! },
  ]
}

function makeSeriesId(
  conference: 'East' | 'West' | 'Finals',
  round: 1 | 2 | 3 | 4,
  index: number,
): string {
  const prefix = conference === 'Finals' ? 'finals' : conference.toLowerCase()
  return `${prefix}-r${round}-${index}`
}

export function generatePlayoffBracket(
  league: LeagueState,
  rules: LeagueRules,
): PlayoffBracket {
  const { standings, teams, seasonYear } = league
  const seriesLength = rules.playoffSeriesLength
  const seedCount = rules.hasPlayIn ? 10 : rules.playoffTeamsPerConference
  const playoffYear = seasonYear + 1

  const eastSeeds = getSeedsByConference(standings, teams, 'East', seedCount)
  const westSeeds = getSeedsByConference(standings, teams, 'West', seedCount)
  const usePlayIn = rules.hasPlayIn && eastSeeds.length >= 10 && westSeeds.length >= 10

  const bracket: PlayoffBracket = {
    seasonYear,
    format: rules.playoffFormat,
    east: [],
    west: [],
    status: usePlayIn ? 'play_in' : 'bracket',
  }

  if (usePlayIn) {
    const eastPlayIn = eastSeeds.slice(6)
    const westPlayIn = westSeeds.slice(6)

    bracket.playIn = {
      east: createPlayInGames(eastPlayIn, 'East'),
      west: createPlayInGames(westPlayIn, 'West'),
    }

    const eastTop6 = eastSeeds.slice(0, 6)
    const westTop6 = westSeeds.slice(0, 6)

    bracket.east = createBracketRounds(eastTop6, 'East', seriesLength, true, playoffYear)
    bracket.west = createBracketRounds(westTop6, 'West', seriesLength, true, playoffYear)
  } else {
    bracket.east = createBracketRounds(eastSeeds, 'East', seriesLength, false, playoffYear)
    bracket.west = createBracketRounds(westSeeds, 'West', seriesLength, false, playoffYear)
  }

  const finalsStartDate = usePlayIn ? `${playoffYear}-06-05` : `${playoffYear}-05-25`
  bracket.finals = {
    id: 'finals-r4-1',
    conference: 'Finals',
    round: 4,
    higherSeedTeamId: '',
    lowerSeedTeamId: '',
    higherSeed: 0,
    lowerSeed: 0,
    seriesLength,
    higherSeedWins: 0,
    lowerSeedWins: 0,
    status: 'scheduled',
    games: [],
    isUpset: false,
    startDate: finalsStartDate,
  }

  if (!usePlayIn) {
    resolveBracketByes(bracket, 'East')
    resolveBracketByes(bracket, 'West')
  }

  return bracket
}

function createPlayInGames(
  seeds: { teamId: string; seed: number }[],
  conference: 'East' | 'West',
): PlayInGame[] {
  if (seeds.length < 4) return []

  const games: PlayInGame[] = []

  const game7v8: PlayInGame = {
    id: `playin-${conference.toLowerCase()}-7v8`,
    conference,
    matchup: '7v8',
    homeTeamId: seeds[0]!.teamId,
    awayTeamId: seeds[1]!.teamId,
    scheduledGameId: `playin-${conference.toLowerCase()}-7v8-game`,
  }
  games.push(game7v8)

  const game9v10: PlayInGame = {
    id: `playin-${conference.toLowerCase()}-9v10`,
    conference,
    matchup: '9v10',
    homeTeamId: seeds[2]!.teamId,
    awayTeamId: seeds[3]!.teamId,
    scheduledGameId: `playin-${conference.toLowerCase()}-9v10-game`,
  }
  games.push(game9v10)

  const gameFinal: PlayInGame = {
    id: `playin-${conference.toLowerCase()}-final`,
    conference,
    matchup: 'final_playin',
    homeTeamId: '',
    awayTeamId: '',
    scheduledGameId: `playin-${conference.toLowerCase()}-final-game`,
  }
  games.push(gameFinal)

  return games
}

function createBracketRounds(
  topSeeds: { teamId: string; seed: number }[],
  conference: 'East' | 'West',
  seriesLength: 1 | 3 | 5 | 7,
  hasPlayIn: boolean,
  playoffYear: number,
): PlayoffSeries[] {
  const result: PlayoffSeries[] = []
  const startDate = hasPlayIn ? `${playoffYear}-04-19` : `${playoffYear}-04-15`

  if (hasPlayIn && topSeeds.length < 6) {
    throw new Error(`Play-in bracket requires at least 6 teams per conference, got ${topSeeds.length}`)
  }

  if (!hasPlayIn && topSeeds.length < 4) {
    throw new Error(`Playoff bracket requires at least 4 teams per conference, got ${topSeeds.length}`)
  }

  const matchups = hasPlayIn
    ? [
        { higher: topSeeds[0]!, lower: { teamId: '', seed: 8 } },
        { higher: topSeeds[3]!, lower: topSeeds[4]! },
        { higher: topSeeds[2]!, lower: topSeeds[5]! },
        { higher: topSeeds[1]!, lower: { teamId: '', seed: 7 } },
      ]
    : topSeeds.length >= 8
      ? [
          { higher: topSeeds[0]!, lower: topSeeds[7]! },
          { higher: topSeeds[3]!, lower: topSeeds[4]! },
          { higher: topSeeds[2]!, lower: topSeeds[5]! },
          { higher: topSeeds[1]!, lower: topSeeds[6]! },
        ]
      : createFirstRoundMatchups(topSeeds)

  for (let i = 0; i < matchups.length; i++) {
    const m = matchups[i]!
    const id = makeSeriesId(conference, 1, i + 1)
    const roundStart = addDays(startDate, i * 2)

    const s: PlayoffSeries = {
      id,
      conference,
      round: 1,
      higherSeedTeamId: m.higher.teamId,
      lowerSeedTeamId: m.lower?.teamId ?? '',
      higherSeed: m.higher.seed,
      lowerSeed: m.lower?.seed ?? 0,
      seriesLength,
      higherSeedWins: 0,
      lowerSeedWins: 0,
      status: 'scheduled',
      games: [],
      isUpset: false,
      startDate: roundStart,
    }

    result.push(s)
  }

  for (let round = 2 as 1 | 2 | 3; round <= 3; round++) {
    const prevRound = (round - 1) as 1 | 2
    const prevSeries = result.filter((s) => s.round === prevRound)
    const slotsNeeded = prevSeries.length / 2

    for (let i = 0; i < slotsNeeded; i++) {
      const id = makeSeriesId(conference, round, i + 1)
      const roundStart = addDays(startDate, (round - 1) * 14 + i * 2)

      const s: PlayoffSeries = {
        id,
        conference,
        round,
        higherSeedTeamId: '',
        lowerSeedTeamId: '',
        higherSeed: 0,
        lowerSeed: 0,
        seriesLength,
        higherSeedWins: 0,
        lowerSeedWins: 0,
        status: 'scheduled',
        games: [],
        isUpset: false,
        startDate: roundStart,
      }
      result.push(s)
    }
  }

  return result
}

function resolveBracketByes(bracket: PlayoffBracket, conference: 'East' | 'West'): void {
  const seriesList = bracket[conference.toLowerCase() as 'east' | 'west']
  const roundOneSeries = seriesList
    .filter((s) => s.round === 1)
    .sort((a, b) => a.id.localeCompare(b.id))

  for (const series of roundOneSeries) {
    if (series.status !== 'scheduled') continue
    if (!series.higherSeedTeamId || series.lowerSeedTeamId) continue

    series.status = 'final'
    series.winnerTeamId = series.higherSeedTeamId
    series.isUpset = false
    advanceBracketWinner(bracket, series)
  }
}

export async function simulatePlayIn(
  league: LeagueState,
  bracket: PlayoffBracket,
  rng: SeededRandom,
  options?: PostseasonSimOptions,
): Promise<{ playIn: PlayInBracket | null; gamesSimulated: number }> {
  if (!bracket.playIn) return { playIn: null, gamesSimulated: 0 }

  const playIn = { ...bracket.playIn }
  let gamesSimulated = 0
  const session = createSimSessionState(league)

  for (const conf of ['east', 'west'] as const) {
    const games = playIn[conf]
    if (!games) continue

    for (const game of games) {
      if (game.winnerTeamId) continue
      if (game.matchup === 'final_playin') continue

      const home = league.teams[game.homeTeamId]
      const away = league.teams[game.awayTeamId]
      if (!home || !away) continue

      const scheduledGame: ScheduledGame = {
        id: game.scheduledGameId,
        season: league.rules.seasonLabel,
        date: league.currentDate,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        status: 'scheduled',
        homeScore: null,
        awayScore: null,
        boxScoreId: null,
        isConference: true,
        isDivision: false,
        seasonYear: league.seasonYear,
        isUserTeamGame: game.homeTeamId === league.userTeamId || game.awayTeamId === league.userTeamId,
        isPlayIn: true,
      }

      const boxScore = await runScheduledPlayoffGame(
        league,
        scheduledGame,
        rng,
        session,
        options,
      )
      if (!boxScore) continue

      game.winnerTeamId = boxScore.homeWin ? game.homeTeamId : game.awayTeamId
      league.games[scheduledGame.id] = scheduledGame
      gamesSimulated++
    }

    const game7v8 = games.find((g) => g.matchup === '7v8')
    const game9v10 = games.find((g) => g.matchup === '9v10')
    const finalGame = games.find((g) => g.matchup === 'final_playin')

    if (game7v8?.winnerTeamId && game9v10?.winnerTeamId && finalGame && !finalGame.winnerTeamId) {
      const game7v8Loser = game7v8.winnerTeamId === game7v8.homeTeamId
        ? game7v8.awayTeamId
        : game7v8.homeTeamId

      finalGame.homeTeamId = game7v8Loser
      finalGame.awayTeamId = game9v10.winnerTeamId

      const finalScheduledGame: ScheduledGame = {
        id: finalGame.scheduledGameId,
        season: league.rules.seasonLabel,
        date: league.currentDate,
        homeTeamId: finalGame.homeTeamId,
        awayTeamId: finalGame.awayTeamId,
        status: 'scheduled',
        homeScore: null,
        awayScore: null,
        boxScoreId: null,
        isConference: true,
        isDivision: false,
        seasonYear: league.seasonYear,
        isUserTeamGame: finalGame.homeTeamId === league.userTeamId || finalGame.awayTeamId === league.userTeamId,
        isPlayIn: true,
      }

      const boxScore = await runScheduledPlayoffGame(
        league,
        finalScheduledGame,
        rng,
        session,
        options,
      )
      if (boxScore) {
        finalGame.winnerTeamId = boxScore.homeWin ? finalGame.homeTeamId : finalGame.awayTeamId
        league.games[finalScheduledGame.id] = finalScheduledGame
        gamesSimulated++
      }
    }
  }

  if (playIn.east?.every((g) => g.winnerTeamId) && playIn.west?.every((g) => g.winnerTeamId)) {
    const east7v8 = playIn.east.find((g) => g.matchup === '7v8')!
    const eastFinal = playIn.east.find((g) => g.matchup === 'final_playin')!
    const west7v8 = playIn.west.find((g) => g.matchup === '7v8')!
    const westFinal = playIn.west.find((g) => g.matchup === 'final_playin')!

    playIn.playInWinners = {
      east7: east7v8.winnerTeamId!,
      east8: eastFinal.winnerTeamId!,
      west7: west7v8.winnerTeamId!,
      west8: westFinal.winnerTeamId!,
    }

    fillPlayInSeeds(bracket, playIn.playInWinners)
  }

  return { playIn, gamesSimulated }
}

function fillPlayInSeeds(
  bracket: PlayoffBracket,
  winners: { east7: string; east8: string; west7: string; west8: string },
): void {
  for (const conf of ['east', 'west'] as const) {
    const seriesList = bracket[conf]
    const r1Series = seriesList.filter((s) => s.round === 1)

    for (const s of r1Series) {
      if (s.higherSeed === 7 || s.lowerSeed === 7) {
        const seed7 = conf === 'east' ? winners.east7 : winners.west7
        if (s.higherSeed === 7) s.higherSeedTeamId = seed7
        else s.lowerSeedTeamId = seed7
      }
      if (s.higherSeed === 8 || s.lowerSeed === 8) {
        const seed8 = conf === 'east' ? winners.east8 : winners.west8
        if (s.higherSeed === 8) s.higherSeedTeamId = seed8
        else s.lowerSeedTeamId = seed8
      }
    }
  }
}

function updateSeriesFromGames(series: PlayoffSeries, games: Record<string, ScheduledGame>): void {
  let higherWins = 0
  let lowerWins = 0

  for (const gameId of series.games) {
    const game = games[gameId]
    if (game?.status !== 'final') continue

    if (game.winnerTeamId === series.higherSeedTeamId) higherWins++
    else if (game.winnerTeamId === series.lowerSeedTeamId) lowerWins++
  }

  series.higherSeedWins = higherWins
  series.lowerSeedWins = lowerWins

  const required = getRequiredWins(series.seriesLength)
  if (higherWins >= required) {
    series.winnerTeamId = series.higherSeedTeamId
    series.status = 'final'
    series.isUpset = false
  } else if (lowerWins >= required) {
    series.winnerTeamId = series.lowerSeedTeamId
    series.status = 'final'
    series.isUpset = true
  } else if (higherWins > 0 || lowerWins > 0) {
    series.status = 'in_progress'
  }
}

function advanceBracketWinner(
  bracket: PlayoffBracket,
  completedSeries: PlayoffSeries,
): void {
  if (completedSeries.round === 4) {
    bracket.finals = completedSeries
    bracket.championTeamId = completedSeries.winnerTeamId
    bracket.runnerUpTeamId = completedSeries.winnerTeamId === completedSeries.higherSeedTeamId
      ? completedSeries.lowerSeedTeamId
      : completedSeries.higherSeedTeamId
    bracket.status = 'complete'
    return
  }

  const conf = completedSeries.conference.toLowerCase() as 'east' | 'west'
  const seriesList = bracket[conf]
  const nextRound = (completedSeries.round + 1) as 1 | 2 | 3

  const currentRoundSeries = seriesList
    .filter((s: PlayoffSeries) => s.round === completedSeries.round)
    .sort((a: PlayoffSeries, b: PlayoffSeries) => a.id.localeCompare(b.id))

  const idx = currentRoundSeries.findIndex((s: PlayoffSeries) => s.id === completedSeries.id)
  const nextRoundSeries = seriesList
    .filter((s: PlayoffSeries) => s.round === nextRound)
    .sort((a: PlayoffSeries, b: PlayoffSeries) => a.id.localeCompare(b.id))

  const slotIndex = Math.floor(idx / 2)
  const nextSeries = nextRoundSeries[slotIndex]

  if (!nextSeries) {
    if (completedSeries.round === 3) {
      populateFinalsFromConferenceWinners(bracket)
    }
    return
  }

  if (idx % 2 === 0) {
    nextSeries.higherSeedTeamId = completedSeries.winnerTeamId!
    nextSeries.higherSeed = completedSeries.higherSeed
  } else {
    nextSeries.lowerSeedTeamId = completedSeries.winnerTeamId!
    nextSeries.lowerSeed = completedSeries.higherSeed
  }

  if (nextSeries.higherSeedTeamId && nextSeries.lowerSeedTeamId) {
    nextSeries.status = 'scheduled'
  }
}

function populateFinalsFromConferenceWinners(bracket: PlayoffBracket): void {
  const eastCF = bracket.east.find((s) => s.round === 3 && s.status === 'final')
  const westCF = bracket.west.find((s) => s.round === 3 && s.status === 'final')

  if (!eastCF?.winnerTeamId || !westCF?.winnerTeamId) return

  const eastSeed = eastCF.winnerTeamId === eastCF.higherSeedTeamId
    ? eastCF.higherSeed
    : eastCF.lowerSeed
  const westSeed = westCF.winnerTeamId === westCF.higherSeedTeamId
    ? westCF.higherSeed
    : westCF.lowerSeed

  if (!bracket.finals) return

  if (eastSeed <= westSeed) {
    bracket.finals.higherSeedTeamId = eastCF.winnerTeamId
    bracket.finals.higherSeed = eastSeed
    bracket.finals.lowerSeedTeamId = westCF.winnerTeamId
    bracket.finals.lowerSeed = westSeed
  } else {
    bracket.finals.higherSeedTeamId = westCF.winnerTeamId
    bracket.finals.higherSeed = westSeed
    bracket.finals.lowerSeedTeamId = eastCF.winnerTeamId
    bracket.finals.lowerSeed = eastSeed
  }

  if (bracket.finals.higherSeedTeamId && bracket.finals.lowerSeedTeamId) {
    bracket.finals.status = 'scheduled'
    bracket.status = 'finals'
  }
}

export async function advancePlayoffSeries(
  league: LeagueState,
  rng: SeededRandom,
  options?: PostseasonSimOptions,
): Promise<AdvancePlayoffResult> {
  const bracket = league.playoffBracket
  if (!bracket) {
    return { gamesSimulated: 0, results: [], seriesCompleted: [], bracketComplete: false }
  }

  const results: PlayoffGameResult[] = []
  const seriesCompleted: string[] = []
  const session = createSimSessionState(league)

  if (bracket.status === 'play_in' && bracket.playIn) {
    const playInResult = await simulatePlayIn(league, bracket, rng, options)
    if (playInResult.playIn) {
      bracket.playIn = playInResult.playIn
      if (playInResult.playIn.playInWinners) {
        bracket.status = 'bracket'
      }
    }
    return { gamesSimulated: playInResult.gamesSimulated, results: [], seriesCompleted: [], bracketComplete: false }
  }

  const allSeries = [...bracket.east, ...bracket.west]
  if (bracket.finals) allSeries.push(bracket.finals)

  for (const series of allSeries) {
    if (series.status === 'final') continue
    if (!series.higherSeedTeamId || !series.lowerSeedTeamId) continue

    const required = getRequiredWins(series.seriesLength)
    if (series.higherSeedWins >= required || series.lowerSeedWins >= required) {
      series.status = 'final'
      continue
    }

    const nextGameNum = series.higherSeedWins + series.lowerSeedWins + 1
    if (nextGameNum > series.seriesLength) continue

    const existingGames = series.games
      .map((id) => league.games[id])
      .filter((g): g is ScheduledGame => Boolean(g))

    let game = existingGames.find((g) => g.playoffGameNumber === nextGameNum && g.status === 'scheduled')

    if (!game) {
      const lastGameDate = existingGames.length > 0
        ? existingGames[existingGames.length - 1]!.date
        : series.startDate
      const newDate = addDays(lastGameDate, 2)

      game = createPlayoffGame(series, nextGameNum, newDate, league.seasonYear, league.rules.seasonLabel, league.userTeamId)
      league.games[game.id] = game
      series.games.push(game.id)
    }

    const home = league.teams[game.homeTeamId]
    const away = league.teams[game.awayTeamId]
    if (!home || !away) continue

    const homePlayers = getPlayersForTeam(home, league)
    const awayPlayers = getPlayersForTeam(away, league)
    if (homePlayers.length < 5 || awayPlayers.length < 5) continue

    const boxScore = await runScheduledPlayoffGame(
      league,
      game,
      rng,
      session,
      options,
    )
    if (!boxScore) continue

    updateSeriesFromGames(series, league.games)

    results.push({
      gameId: game.id,
      seriesId: series.id,
      gameNumber: nextGameNum,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: boxScore.homeScore,
      awayScore: boxScore.awayScore,
      winnerTeamId: game.winnerTeamId!,
    })

    if ((series.status as string) === 'final') {
      seriesCompleted.push(series.id)
      advanceBracketWinner(bracket, series)
    }

    break
  }

  const bracketComplete = bracket.status === 'complete'

  return {
    gamesSimulated: results.length,
    results,
    seriesCompleted,
    bracketComplete,
  }
}

export async function simulateSeries(
  league: LeagueState,
  seriesId: string,
  rng: SeededRandom,
  options?: PostseasonSimOptions,
): Promise<PlayoffGameResult[]> {
  const bracket = league.playoffBracket
  if (!bracket) return []

  const allSeries = [...bracket.east, ...bracket.west]
  if (bracket.finals) allSeries.push(bracket.finals)

  const series = allSeries.find((s) => s.id === seriesId)
  if (!series || series.status === 'final') return []

  const results: PlayoffGameResult[] = []
  const required = getRequiredWins(series.seriesLength)
  const session = createSimSessionState(league)

  while (series.higherSeedWins < required && series.lowerSeedWins < required) {
    const nextGameNum = series.higherSeedWins + series.lowerSeedWins + 1
    if (nextGameNum > series.seriesLength) break

    const existingGames = series.games
      .map((id) => league.games[id])
      .filter((g): g is ScheduledGame => Boolean(g))

    let game = existingGames.find((g) => g.playoffGameNumber === nextGameNum && g.status === 'scheduled')

    if (!game) {
      const lastGameDate = existingGames.length > 0
        ? existingGames[existingGames.length - 1]!.date
        : series.startDate
      const newDate = addDays(lastGameDate, 2)

      game = createPlayoffGame(series, nextGameNum, newDate, league.seasonYear, league.rules.seasonLabel, league.userTeamId)
      league.games[game.id] = game
      series.games.push(game.id)
    }

    const home = league.teams[game.homeTeamId]
    const away = league.teams[game.awayTeamId]
    if (!home || !away) break

    const homePlayers = getPlayersForTeam(home, league)
    const awayPlayers = getPlayersForTeam(away, league)
    if (homePlayers.length < 5 || awayPlayers.length < 5) break

    const boxScore = await runScheduledPlayoffGame(
      league,
      game,
      rng,
      session,
      options,
    )
    if (!boxScore) break

    updateSeriesFromGames(series, league.games)

    results.push({
      gameId: game.id,
      seriesId: series.id,
      gameNumber: nextGameNum,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: boxScore.homeScore,
      awayScore: boxScore.awayScore,
      winnerTeamId: game.winnerTeamId!,
    })
  }

  if ((series.status as string) === 'final') {
    advanceBracketWinner(bracket, series)
  }

  return results
}

export function computeTeamSeasonResults(
  bracket: PlayoffBracket,
  allTeamIds: string[],
): Record<string, TeamSeasonResult> {
  const results: Record<string, TeamSeasonResult> = {}

  function processSeries(s: PlayoffSeries) {
    if (s.status !== 'final' || !s.winnerTeamId) return

    const loserId = s.winnerTeamId === s.higherSeedTeamId
      ? s.lowerSeedTeamId
      : s.higherSeedTeamId

    let loserResult: TeamSeasonResult
    switch (s.round) {
      case 1: loserResult = 'first_round_loss'; break
      case 2: loserResult = 'second_round_loss'; break
      case 3: loserResult = 'conference_finals_loss'; break
      case 4: loserResult = 'finals_loss'; break
      default: loserResult = 'first_round_loss'
    }

    results[loserId] = loserResult

    if (s.round === 4) {
      results[s.winnerTeamId] = 'champion'
    }
  }

  for (const s of bracket.east) processSeries(s)
  for (const s of bracket.west) processSeries(s)
  if (bracket.finals) processSeries(bracket.finals)

  for (const teamId of allTeamIds) {
    results[teamId] ??= 'missed_playoffs'
  }

  return results
}

export function getPlayoffSeeds(
  bracket: PlayoffBracket,
  conference: 'East' | 'West',
): { teamId: string; seed: number }[] {
  const conf = conference.toLowerCase() as 'east' | 'west'
  const seriesList = bracket[conf]
  const r1Series = seriesList
    .filter((s) => s.round === 1)
    .sort((a, b) => a.higherSeed - b.higherSeed)

  const seeds: { teamId: string; seed: number }[] = []
  for (const s of r1Series) {
    seeds.push({ teamId: s.higherSeedTeamId, seed: s.higherSeed })
    if (s.lowerSeedTeamId) {
      seeds.push({ teamId: s.lowerSeedTeamId, seed: s.lowerSeed })
    }
  }

  return seeds
}

export function isBracketComplete(bracket: PlayoffBracket): boolean {
  return bracket.status === 'complete'
}

export function getSeriesById(
  bracket: PlayoffBracket,
  seriesId: string,
): PlayoffSeries | undefined {
  const all = [...bracket.east, ...bracket.west]
  if (bracket.finals) all.push(bracket.finals)
  return all.find((s) => s.id === seriesId)
}
