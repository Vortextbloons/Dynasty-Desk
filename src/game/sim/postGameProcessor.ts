import type { GameSave } from '@/game/models/save'
import type { Player } from '@/game/models/player'
import type { NewsEvent } from '@/game/models/news'
import type { Team } from '@/game/models/team'
import { updateFatigue, recoverFatigue, isHighUsagePlayer } from '@/game/sim/fatigueEngine'
import {
  rollForInjury,
  applyInjuryToHealth,
} from '@/game/sim/injuryEngine'
import { updateMorale, shouldRequestTrade } from '@/game/sim/moraleEngine'
import { updateChemistry } from '@/game/sim/chemistryEngine'
import { computeAwardRaces } from '@/game/league/awardsEngine'
import {
  createInjuryNews,
  createMoraleEvent,
  createHotStreakEvent,
  createColdStreakEvent,
} from '@/game/league/newsEngine'
import type { SeededRandom } from '@/game/sim/rng'
import { computeTeamStreak } from '@/game/league/teamStreak'

export interface PostGameContext {
  homeTeamId: string
  awayTeamId: string
  homeWon: boolean
  date: string
  minutesPlayed: Record<string, number>
  gameFatigue: Record<string, number>
  injuriesEnabled: boolean
  fatigueEnabled: boolean
  backToBackTeams: Set<string>
}

export interface PostGameResult {
  news: NewsEvent[]
  injuries: { playerId: string; description: string }[]
}

function applyPostGamePlayer(
  player: Player,
  team: Team,
  league: GameSave['league'],
  ctx: PostGameContext,
  rng: SeededRandom,
  news: NewsEvent[],
  injuries: PostGameResult['injuries'],
): void {
  const minutes = ctx.minutesPlayed[player.id] ?? 0
  if (minutes <= 0) return

  if (ctx.fatigueEnabled) {
    const inGameFatigue = ctx.gameFatigue[player.id] ?? player.fatigue
    player.fatigue = inGameFatigue
  }

  if (ctx.injuriesEnabled && player.health.status !== 'season_ending') {
    const injury = rollForInjury(
      player,
      {
        minutes,
        fatigue: ctx.gameFatigue[player.id] ?? player.fatigue,
        contact: rng.chance(0.4),
        backToBack: ctx.backToBackTeams.has(team.id),
        injuriesEnabled: true,
      },
      rng,
      ctx.date,
    )
    if (injury) {
      player.health = applyInjuryToHealth(player.health, injury)
      const desc = player.health.injuryDescription ?? injury.bodyPart
      injuries.push({ playerId: player.id, description: desc })
      news.push(createInjuryNews(player, desc, ctx.date))
    }
  }

  const standing = league.standings[team.id]
  const targetMinutes = team.lineup.targetMinutes[player.id] ?? 24
  const streak = computeTeamStreak(league.games, team.id)
  const salary = player.contract.salaryByYear[0] ?? 1
  const valueRatio = player.ratings.overall / 70 / (salary / 10_000_000)

  const prevTrade = player.morale.tradeRequest
  player.morale = updateMorale(player.morale, {
    minutes,
    targetMinutes,
    isStarter: team.lineup.starters.includes(player.id),
    teamWins: standing?.wins ?? 0,
    teamLosses: standing?.losses ?? 0,
    contractValueRatio: valueRatio,
    tradeRumors: false,
    winStreak: streak.wins,
    loseStreak: streak.losses,
    teamChemistry: team.chemistry,
  })

  if (!prevTrade && shouldRequestTrade(player.morale)) {
    news.push(createMoraleEvent(player, ctx.date))
  }
}

const STREAK_NEWS_MILESTONES = [5, 8, 10, 12, 15, 20] as const

function isStreakNewsMilestone(length: number): boolean {
  return (
    STREAK_NEWS_MILESTONES.includes(length as (typeof STREAK_NEWS_MILESTONES)[number]) ||
    (length > 20 && length % 5 === 0)
  )
}

function applyPostGameTeam(
  team: Team,
  league: GameSave['league'],
  news: NewsEvent[],
  date: string,
): void {
  const standing = league.standings[team.id]
  const streak = computeTeamStreak(league.games, team.id)
  team.chemistry = updateChemistry(team.chemistry, {
    wins: standing?.wins ?? 0,
    losses: standing?.losses ?? 0,
    recentTrades: 0,
    continuity: team.chemistry,
    egoConflicts: 0,
    winStreak: streak.wins,
    loseStreak: streak.losses,
  })

  const teamName = `${team.city} ${team.name}`
  if (streak.wins > 0 && isStreakNewsMilestone(streak.wins)) {
    news.push(createHotStreakEvent(teamName, team.id, streak.wins, date))
  }
  if (streak.losses > 0 && isStreakNewsMilestone(streak.losses)) {
    news.push(createColdStreakEvent(teamName, team.id, streak.losses, date))
  }
}

export function recoverFatigueBetweenGames(
  league: GameSave['league'],
  daysBetween: number,
): void {
  for (const player of Object.values(league.players)) {
    player.fatigue = recoverFatigue(player.fatigue, daysBetween)
  }
}

export function processPostGame(
  save: GameSave,
  ctx: PostGameContext,
  rng: SeededRandom,
): PostGameResult {
  const news: NewsEvent[] = []
  const injuries: PostGameResult['injuries'] = []
  const league = save.league

  const home = league.teams[ctx.homeTeamId]
  const away = league.teams[ctx.awayTeamId]
  if (!home || !away) return { news, injuries }

  const allIds = new Set([
    ...home.roster,
    ...away.roster,
  ])

  for (const pid of allIds) {
    const player = league.players[pid]
    if (!player?.teamId) continue
    const team = league.teams[player.teamId]
    if (!team) continue
    applyPostGamePlayer(player, team, league, ctx, rng, news, injuries)
  }

  applyPostGameTeam(home, league, news, ctx.date)
  applyPostGameTeam(away, league, news, ctx.date)

  league.awardRaces = computeAwardRaces(league)

  return { news, injuries }
}

export function accumulateGameFatigue(
  player: Player,
  currentFatigue: number,
  minutesDelta: number,
  pace: Team['strategy']['offense']['pace'],
): number {
  return updateFatigue(
    currentFatigue,
    minutesDelta,
    pace,
    isHighUsagePlayer(player),
  )
}
