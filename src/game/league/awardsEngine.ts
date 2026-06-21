import type { PlayoffBracket } from '@/game/models/playoff'
import type { ScheduledGame } from '@/game/models/game'
import type { LeagueState } from '@/game/models/league'
import type { Player } from '@/game/models/player'
import type { AwardSeason, AwardWinner, AwardRaceEntry } from '@/game/models/award'
import type { Position } from '@/game/models/position'

export interface FinalsMvpCandidate {
  playerId: string
  teamId: string
  totalPoints: number
  totalRebounds: number
  totalAssists: number
  totalMinutes: number
  combinedStat: number
}

export function computeFinalsMvp(
  bracket: PlayoffBracket,
  games: Record<string, ScheduledGame>,
): string | null {
  const finals = bracket.finals
  if (finals?.status !== 'final') return null

  const finalsGames = finals.games
    .map((id) => games[id])
    .filter((g): g is ScheduledGame => g?.status === 'final')

  if (finalsGames.length === 0) return null

  const playerTotals = new Map<string, {
    teamId: string
    points: number
    rebounds: number
    assists: number
    minutes: number
  }>()

  for (const game of finalsGames) {
    if (!game.boxScore) continue
    const boxScore = game.boxScore

    for (const [playerId, stats] of Object.entries(boxScore.playerStats)) {
      const existing = playerTotals.get(playerId)
      if (existing) {
        existing.points += stats.points
        existing.rebounds += stats.totalRebounds
        existing.assists += stats.assists
        existing.minutes += stats.minutes
      } else {
        playerTotals.set(playerId, {
          teamId: stats.teamId,
          points: stats.points,
          rebounds: stats.totalRebounds,
          assists: stats.assists,
          minutes: stats.minutes,
        })
      }
    }
  }

  let bestPlayer: string | null = null
  let bestScore = -1
  let bestMinutes = -1

  for (const [playerId, totals] of playerTotals) {
    const combined = totals.points + totals.rebounds + totals.assists
    if (
      combined > bestScore ||
      (combined === bestScore && totals.minutes > bestMinutes)
    ) {
      bestScore = combined
      bestMinutes = totals.minutes
      bestPlayer = playerId
    }
  }

  return bestPlayer
}

export function getCandidatesForFinals(
  bracket: PlayoffBracket,
  games: Record<string, ScheduledGame>,
): FinalsMvpCandidate[] {
  const finals = bracket.finals
  if (finals?.status !== 'final') return []

  const finalsGames = finals.games
    .map((id) => games[id])
    .filter((g): g is ScheduledGame => g?.status === 'final')

  const playerTotals = new Map<string, {
    teamId: string
    points: number
    rebounds: number
    assists: number
    minutes: number
  }>()

  for (const game of finalsGames) {
    if (!game.boxScore) continue

    for (const [playerId, stats] of Object.entries(game.boxScore.playerStats)) {
      const existing = playerTotals.get(playerId)
      if (existing) {
        existing.points += stats.points
        existing.rebounds += stats.totalRebounds
        existing.assists += stats.assists
        existing.minutes += stats.minutes
      } else {
        playerTotals.set(playerId, {
          teamId: stats.teamId,
          points: stats.points,
          rebounds: stats.totalRebounds,
          assists: stats.assists,
          minutes: stats.minutes,
        })
      }
    }
  }

  return Array.from(playerTotals.entries())
    .map(([playerId, t]) => ({
      playerId,
      teamId: t.teamId,
      totalPoints: t.points,
      totalRebounds: t.rebounds,
      totalAssists: t.assists,
      totalMinutes: t.minutes,
      combinedStat: t.points + t.rebounds + t.assists,
    }))
    .sort((a, b) => {
      if (b.combinedStat !== a.combinedStat) return b.combinedStat - a.combinedStat
      return b.totalMinutes - a.totalMinutes
    })
}

interface PlayerAwardCandidate {
  playerId: string
  teamId: string
  score: number
  statLine: string
  position: Position
  games: number
  mpg: number
  isRookie: boolean
  isBench: boolean
}

function playerName(p: Player | undefined): string {
  if (!p) return 'Unknown'
  return `${p.firstName} ${p.lastName}`
}

function statLineFromSeason(p: Player): string {
  const s = p.seasonStats
  const g = Math.max(1, s.gamesPlayed)
  const ppg = (s.points / g).toFixed(1)
  const rpg = (s.rebounds / g).toFixed(1)
  const apg = (s.assists / g).toFixed(1)
  return `${ppg} / ${rpg} / ${apg}`
}

function isRookiePlayer(p: Player): boolean {
  return p.age <= 22 && p.seasonStats.gamesPlayed > 0 && p.careerStats.length <= 1
}

function isBenchPlayer(p: Player, team: LeagueState['teams'][string]): boolean {
  const mpg =
    p.seasonStats.gamesPlayed > 0
      ? p.seasonStats.minutes / p.seasonStats.gamesPlayed
      : 0
  const inStartingFive = team.lineup.starters.includes(p.id)
  return !inStartingFive && mpg <= 30 && mpg >= 15
}

function mvpScore(p: Player, teamWins: number, teamLosses: number, bestRecord = false): number {
  const s = p.seasonStats
  const g = Math.max(1, s.gamesPlayed)
  const perGame = s.points / g + s.rebounds / g * 1.2 + s.assists / g * 1.5
  const total = teamWins + teamLosses
  const winBoost = total > 0 ? (teamWins / total) * 12 : 6
  const minutesFactor = Math.min(1, (s.minutes / g) / 34)
  let score = perGame * minutesFactor + winBoost + p.ratings.overall * 0.05
  if (bestRecord) score *= 1.2
  return score
}

function dpoyScore(p: Player): number {
  const s = p.seasonStats
  const g = Math.max(1, s.gamesPlayed)
  return (
    p.ratings.perimeterDefense * 0.25 +
    p.ratings.interiorDefense * 0.2 +
    p.ratings.defensiveIq * 0.2 +
    (s.steals / g) * 15 +
    (s.blocks / g) * 12 +
    p.ratings.overall * 0.05
  )
}

function buildCandidates(league: LeagueState): PlayerAwardCandidate[] {
  const out: PlayerAwardCandidate[] = []
  let bestWins = 0
  for (const standing of Object.values(league.standings)) {
    if (standing.wins > bestWins) bestWins = standing.wins
  }
  for (const p of Object.values(league.players)) {
    if (!p.teamId || p.seasonStats.gamesPlayed < 10) continue
    const team = league.teams[p.teamId]
    if (!team) continue
    const standing = league.standings[p.teamId]
    const wins = standing?.wins ?? 41
    const losses = standing?.losses ?? 41
    const isBestRecord = standing?.wins === bestWins && bestWins > 0
    const mpg =
      p.seasonStats.minutes / Math.max(1, p.seasonStats.gamesPlayed)
    out.push({
      playerId: p.id,
      teamId: p.teamId,
      score: mvpScore(p, wins, losses, isBestRecord),
      statLine: statLineFromSeason(p),
      position: p.position,
      games: p.seasonStats.gamesPlayed,
      mpg,
      isRookie: isRookiePlayer(p),
      isBench: isBenchPlayer(p, team),
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

export function computeAwardRaces(league: LeagueState): Record<string, AwardRaceEntry[]> {
  const candidates = buildCandidates(league)
  const players = league.players

  const mvp = candidates.slice(0, 5).map((c) => ({
    playerId: c.playerId,
    teamId: c.teamId,
    score: c.score,
    statLine: c.statLine,
  }))

  const dpoy = [...candidates]
    .sort((a, b) => dpoyScore(players[a.playerId]!) - dpoyScore(players[b.playerId]!))
    .slice(0, 5)
    .map((c) => ({
      playerId: c.playerId,
      teamId: c.teamId,
      score: dpoyScore(players[c.playerId]!),
      statLine: c.statLine,
    }))

  const roy = candidates
    .filter((c) => c.isRookie)
    .slice(0, 5)
    .map((c) => ({
      playerId: c.playerId,
      teamId: c.teamId,
      score: c.score,
      statLine: c.statLine,
    }))

  const smoy = candidates
    .filter((c) => c.isBench)
    .slice(0, 5)
    .map((c) => ({
      playerId: c.playerId,
      teamId: c.teamId,
      score: c.score,
      statLine: c.statLine,
    }))

  return { mvp, dpoy, roy, smoy }
}

const MVP_VOTE_WEIGHTS = [10, 7, 5, 3, 1]

function pickAllLeagueByPosition(
  candidates: PlayerAwardCandidate[],
  players: Record<string, Player>,
  slots: { G: number; F: number; C: number },
): string[] {
  const guards = candidates.filter((c) => {
    const pos = players[c.playerId]?.position
    return pos === 'PG' || pos === 'SG'
  })
  const forwards = candidates.filter((c) => {
    const pos = players[c.playerId]?.position
    return pos === 'SF' || pos === 'PF'
  })
  const centers = candidates.filter((c) => players[c.playerId]?.position === 'C')
  const picked: string[] = []
  for (const g of guards.slice(0, slots.G)) picked.push(g.playerId)
  for (const f of forwards.slice(0, slots.F)) picked.push(f.playerId)
  for (const c of centers.slice(0, slots.C)) picked.push(c.playerId)
  return picked
}

export function computeSeasonAwards(
  league: LeagueState,
  seasonLabel: string,
): AwardSeason {
  const candidates = buildCandidates(league)
  const players = league.players
  const awards: AwardWinner[] = []

  const mvpCandidates = candidates.slice(0, 5)
  if (mvpCandidates[0]) {
    awards.push({
      season: seasonLabel,
      award: 'mvp',
      playerId: mvpCandidates[0].playerId,
      teamId: mvpCandidates[0].teamId,
    })
  }

  const dpoySorted = [...candidates].sort(
    (a, b) => dpoyScore(players[a.playerId]!) - dpoyScore(players[b.playerId]!),
  )
  if (dpoySorted[0]) {
    awards.push({
      season: seasonLabel,
      award: 'dpoy',
      playerId: dpoySorted[0].playerId,
      teamId: dpoySorted[0].teamId,
    })
  }

  const roy = candidates.find((c) => c.isRookie)
  if (roy) {
    awards.push({ season: seasonLabel, award: 'roy', playerId: roy.playerId, teamId: roy.teamId })
  }

  const smoy = candidates.find((c) => c.isBench)
  if (smoy) {
    awards.push({ season: seasonLabel, award: 'smoy', playerId: smoy.playerId, teamId: smoy.teamId })
  }

  const mipCandidates = Object.values(players)
    .filter((p) => p.age >= 22 && p.age <= 28)
    .map((p) => {
      const delta = Object.values(p.development.ratingsDelta).reduce((s, v) => s + v, 0)
      return { p, delta }
    })
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
  if (mipCandidates[0]?.p.teamId) {
    awards.push({
      season: seasonLabel,
      award: 'mip',
      playerId: mipCandidates[0].p.id,
      teamId: mipCandidates[0].p.teamId,
    })
  }

  let bestCoyTeam: string | null = null
  let bestCoyWins = -1
  for (const [tid, standing] of Object.entries(league.standings)) {
    if (standing.wins > bestCoyWins) {
      bestCoyWins = standing.wins
      bestCoyTeam = tid
    }
  }
  if (bestCoyTeam) {
    const star = league.teams[bestCoyTeam]?.roster
      .map((id) => players[id])
      .filter((p): p is Player => Boolean(p))
      .sort((a, b) => b.ratings.overall - a.ratings.overall)[0]
    if (star?.teamId) {
      awards.push({
        season: seasonLabel,
        award: 'coty',
        playerId: star.id,
        teamId: star.teamId,
      })
    }
  }

  const allNba1 = pickAllLeagueByPosition(candidates, players, { G: 2, F: 2, C: 1 })
  const used = new Set(allNba1)
  const remaining = candidates.filter((c) => !used.has(c.playerId))
  const allNba2 = pickAllLeagueByPosition(remaining, players, { G: 2, F: 2, C: 1 })
  for (const id of allNba2) used.add(id)
  const remaining2 = candidates.filter((c) => !used.has(c.playerId))
  const allNba3 = pickAllLeagueByPosition(remaining2, players, { G: 2, F: 2, C: 1 })

  for (const pid of allNba1) {
    const p = players[pid]
    if (p?.teamId) awards.push({ season: seasonLabel, award: 'all_nba_1', playerId: pid, teamId: p.teamId })
  }
  for (const pid of allNba2) {
    const p = players[pid]
    if (p?.teamId) awards.push({ season: seasonLabel, award: 'all_nba_2', playerId: pid, teamId: p.teamId })
  }
  for (const pid of allNba3) {
    const p = players[pid]
    if (p?.teamId) awards.push({ season: seasonLabel, award: 'all_nba_3', playerId: pid, teamId: p.teamId })
  }

  const defCandidates = [...candidates].sort(
    (a, b) => dpoyScore(players[a.playerId]!) - dpoyScore(players[b.playerId]!),
  )
  const allDef1 = pickAllLeagueByPosition(defCandidates, players, { G: 2, F: 2, C: 1 })
  const defUsed = new Set(allDef1)
  const defRemaining = defCandidates.filter((c) => !defUsed.has(c.playerId))
  const allDef2 = pickAllLeagueByPosition(defRemaining, players, { G: 2, F: 2, C: 1 })

  for (const pid of allDef1) {
    const p = players[pid]
    if (p?.teamId) awards.push({ season: seasonLabel, award: 'all_defense_1', playerId: pid, teamId: p.teamId })
  }
  for (const pid of allDef2) {
    const p = players[pid]
    if (p?.teamId) awards.push({ season: seasonLabel, award: 'all_defense_2', playerId: pid, teamId: p.teamId })
  }

  const rookies = candidates.filter((c) => c.isRookie)
  const allRookie1 = pickAllLeagueByPosition(rookies, players, { G: 2, F: 2, C: 1 })
  const rUsed = new Set(allRookie1)
  const rRemaining = rookies.filter((c) => !rUsed.has(c.playerId))
  const allRookie2 = pickAllLeagueByPosition(rRemaining, players, { G: 2, F: 2, C: 1 })

  for (const pid of allRookie1) {
    const p = players[pid]
    if (p?.teamId) awards.push({ season: seasonLabel, award: 'all_rookie_1', playerId: pid, teamId: p.teamId })
  }
  for (const pid of allRookie2) {
    const p = players[pid]
    if (p?.teamId) awards.push({ season: seasonLabel, award: 'all_rookie_2', playerId: pid, teamId: p.teamId })
  }

  return { season: seasonLabel, awards, champions: [] }
}

export function mvpVoteTotals(
  candidates: AwardRaceEntry[],
): { playerId: string; votes: number }[] {
  return candidates.slice(0, 5).map((c, i) => ({
    playerId: c.playerId,
    votes: MVP_VOTE_WEIGHTS[i] ?? 0,
  }))
}

export { playerName }
