import type { LeagueState } from '@/game/models/league'
import type { NewsEvent } from '@/game/models/news'
import type { AwardType } from '@/game/models/award'
import { computeSeasonAwards, computeAwardRaces } from '@/game/league/awardsEngine'
import { createAwardEvent } from '@/game/league/newsEngine'
import { endOfSeasonDevelopment } from '@/game/sim/developmentEngine'
import { computeOverall } from '@/game/ratings/overallWeights'
import type { SeededRandom } from '@/game/sim/rng'
import { inductPlayers } from '@/game/league/hallOfFameEngine'
import { createMilestoneEvent } from '@/game/league/newsEngine'

const MAJOR_AWARDS: AwardType[] = ['mvp', 'dpoy', 'roy', 'smoy', 'mip', 'coty']

export function runLeagueEndOfSeasonDevelopment(
  league: LeagueState,
  rng: SeededRandom,
): void {
  for (const player of Object.values(league.players)) {
    if (!player.teamId) continue
    const team = league.teams[player.teamId]
    const result = endOfSeasonDevelopment(
      player,
      player.seasonStats,
      {
        trainingFocus: player.development.trainingFocus,
        teamFocus: team?.trainingFocus ?? 'balanced',
        minutesPerGame:
          player.seasonStats.gamesPlayed > 0
            ? player.seasonStats.minutes / player.seasonStats.gamesPlayed
            : 0,
        majorInjuries: player.health.injuryHistory.filter(
          (i) => i.severity === 'long_term' || i.severity === 'season_ending',
        ).length,
        morale: player.morale.happiness,
      },
      rng,
    )
    player.ratings = {
      ...result.ratings,
      overall: computeOverall(result.ratings, player.position),
    }
    player.development.ratingsDelta = result.ratingsDelta
  }
}

export function runLeagueSeasonAwards(league: LeagueState): NewsEvent[] {
  const season = league.rules.seasonLabel
  const existingEntry = league.awardsHistory.find((a) => a.season === season)
  const preservedFinalsMvp =
    existingEntry?.awards.filter((a) => a.award === 'finals_mvp') ?? []
  const awardSeason = computeSeasonAwards(league, season)
  for (const fm of preservedFinalsMvp) {
    if (!awardSeason.awards.some((a) => a.award === 'finals_mvp')) {
      awardSeason.awards.push(fm)
    }
  }
  const existing = league.awardsHistory.findIndex((a) => a.season === season)
  if (existing >= 0) {
    league.awardsHistory[existing] = awardSeason
  } else {
    league.awardsHistory.push(awardSeason)
  }
  league.awardRaces = computeAwardRaces(league)

  const news: NewsEvent[] = []
  for (const award of awardSeason.awards) {
    if (!MAJOR_AWARDS.includes(award.award)) continue
    const player = league.players[award.playerId]
    if (!player) continue
    news.push(createAwardEvent(award.award, player, league.currentDate))
  }

  const newHoF = inductPlayers(league.seasonYear, league)
  for (const entry of newHoF) {
    league.hallOfFame.push(entry)
    const player = league.players[entry.playerId]
    if (player) {
      news.push(createMilestoneEvent(player, 'Hall of Fame induction', league.currentDate))
    }
  }

  return news
}
