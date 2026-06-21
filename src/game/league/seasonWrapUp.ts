import type { LeagueState } from '@/game/models/league'
import type { NewsEvent } from '@/game/models/news'
import type { AwardType } from '@/game/models/award'
import { computeSeasonAwards, computeAwardRaces } from '@/game/league/awardsEngine'
import { createAwardEvent, createMilestoneEvent, createCoachPressureEvent } from '@/game/league/newsEngine'
import { endOfSeasonDevelopment } from '@/game/sim/developmentEngine'
import { computeOverall } from '@/game/ratings/overallWeights'
import { clamp } from '@/lib/utils'
import type { SeededRandom } from '@/game/sim/rng'
import { inductPlayers } from '@/game/league/hallOfFameEngine'
import { checkSeasonRecords } from '@/game/league/recordTracker'
import { evaluateCoachPressure } from '@/game/management/coachPressureEngine'

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
      overall: clamp(computeOverall(result.ratings, player.position), 25, 99),
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

  const newSeasonRecords = checkSeasonRecords(league)
  for (const record of newSeasonRecords) {
    if (!league.records) league.records = []
    const existingIdx = league.records.findIndex(
      (r) => r.category === record.category && r.seasonYear === record.seasonYear,
    )
    if (existingIdx >= 0) {
      league.records[existingIdx] = record
    } else {
      league.records.push(record)
    }
    if (record.playerId) {
      const player = league.players[record.playerId]
      if (player) {
        const catLabel = record.category.replace(/_/g, ' ')
        news.push(createMilestoneEvent(player, `New ${catLabel} record: ${record.value}`, league.currentDate))
      }
    }
  }

  return news
}

export function runLeagueCoachPressureNews(league: LeagueState): NewsEvent[] {
  const news: NewsEvent[] = []
  for (const team of Object.values(league.teams)) {
    const pressure = evaluateCoachPressure(team, league)
    if (pressure === 'low') continue
    const teamName = `${team.city} ${team.name}`
    news.push(createCoachPressureEvent(team.id, teamName, pressure, league.currentDate))
  }
  return news
}
