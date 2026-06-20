import type { LeagueState } from '@/game/models/league'
import type { Player } from '@/game/models/player'
import { SEASON_PERFORMANCE_BONUS } from '@/game/management/financeConstants'
import { computeTeamSeasonResults } from './playoffEngine'
import { updateTeamDirection } from '@/game/management/tradeAI'
import { directionChangeReason } from '@/game/management/aiTeamDirectionEngine'
import { createDirectionChangeNews } from '@/game/league/newsEngine'
import { runLeagueSeasonAwards } from '@/game/league/seasonWrapUp'

export interface OffseasonTransitionResult {
  phase: LeagueState['phase']
  championId?: string
  finalsMvpId?: string
  revenueAwarded: number
}

export function transitionToOffseason(
  league: LeagueState,
): OffseasonTransitionResult {
  league.phase = 'offseason'

  const bracket = league.playoffBracket
  const allTeamIds = Object.keys(league.teams)
  let totalRevenueAwarded = 0

  if (bracket?.status === 'complete') {
    const teamResults = computeTeamSeasonResults(bracket, allTeamIds)

    for (const [teamId, result] of Object.entries(teamResults)) {
      const team = league.teams[teamId]
      if (!team) continue

      const bonus = SEASON_PERFORMANCE_BONUS[result] ?? 0
      team.finances.seasonPerformanceBonus += bonus
      team.finances.totalRevenue += bonus
      team.finances.cashReserves += bonus
      totalRevenueAwarded += bonus
    }

    if (bracket.championTeamId) {
      const seasonLabel = league.rules.seasonLabel

      if (bracket.finalsMvpPlayerId) {
        const existingSeason = league.awardsHistory.find((a) => a.season === seasonLabel)
        if (existingSeason) {
          existingSeason.awards.push({
            season: seasonLabel,
            award: 'finals_mvp',
            playerId: bracket.finalsMvpPlayerId,
            teamId: bracket.championTeamId,
          })
        } else {
          league.awardsHistory.push({
            season: seasonLabel,
            awards: [{
              season: seasonLabel,
              award: 'finals_mvp',
              playerId: bracket.finalsMvpPlayerId,
              teamId: bracket.championTeamId,
            }],
            champions: [],
          })
        }

        const mvpPlayer = league.players[bracket.finalsMvpPlayerId]
        const mvpName = mvpPlayer
          ? `${mvpPlayer.firstName} ${mvpPlayer.lastName}`
          : 'Player'

        league.news.push({
          id: `news-finals-mvp-${league.seasonYear}`,
          date: league.currentDate,
          type: 'finals_mvp',
          headline: `${mvpName} wins Finals MVP`,
          body: `${mvpName} has been named Finals MVP for the ${seasonLabel} season.`,
          teamIds: [bracket.championTeamId],
          playerIds: [bracket.finalsMvpPlayerId],
          importance: 'high',
        })
      }

      league.champions.push({
        season: seasonLabel,
        championTeamId: bracket.championTeamId,
        runnerUpTeamId: bracket.runnerUpTeamId ?? '',
        finalsMvpPlayerId: bracket.finalsMvpPlayerId ?? '',
        seriesResult: `${bracket.finals?.higherSeedWins ?? 0}-${bracket.finals?.lowerSeedWins ?? 0}`,
      })

      const championTeam = league.teams[bracket.championTeamId]
      const championName = championTeam
        ? `${championTeam.city} ${championTeam.name}`
        : 'Champion'

      league.news.push({
        id: `news-championship-${league.seasonYear}`,
        date: league.currentDate,
        type: 'championship',
        headline: `${championName} win the championship!`,
        body: `${championName} have won the ${seasonLabel} NBA championship.`,
        teamIds: [bracket.championTeamId],
        playerIds: bracket.finalsMvpPlayerId ? [bracket.finalsMvpPlayerId] : [],
        importance: 'high',
      })
    }
  }

  const awardNews = runLeagueSeasonAwards(league)
  league.news.push(...awardNews)

  fireOffseasonBeginsNews(league)

  for (const teamId of allTeamIds) {
    const team = league.teams[teamId]
    if (!team) continue
    const standing = league.standings[teamId]
    const rosterPlayers = team.roster
      .map((id) => league.players[id])
      .filter((p): p is Player => Boolean(p))
    const avgAge =
      rosterPlayers.length > 0
        ? rosterPlayers.reduce((sum, p) => sum + p.age, 0) / rosterPlayers.length
        : 27
    const prev = team.direction
    const next = updateTeamDirection(
      team,
      standing ? { wins: standing.wins, losses: standing.losses } : undefined,
      league,
    )
    if (next !== prev) {
      const teamName = `${team.city} ${team.name}`
      const reason = directionChangeReason(prev, next, standing, avgAge)
      league.news.push(
        createDirectionChangeNews(teamName, teamId, prev, next, reason, league.currentDate),
      )
      team.direction = next
      team.directionAutoUpdatedAt = new Date().toISOString()
    }
  }

  return {
    phase: 'offseason',
    championId: bracket?.championTeamId,
    finalsMvpId: bracket?.finalsMvpPlayerId,
    revenueAwarded: totalRevenueAwarded,
  }
}

function fireOffseasonBeginsNews(league: LeagueState): void {
  league.news.push({
    id: `news-offseason-${league.seasonYear}`,
    date: league.currentDate,
    type: 'offseason_begins',
    headline: 'Offseason begins',
    body: `The ${league.rules.seasonLabel} offseason has begun. Teams can now make trades, sign free agents, and prepare for the draft.`,
    teamIds: [],
    playerIds: [],
    importance: 'medium',
  })
}
