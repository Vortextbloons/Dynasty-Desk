import type { LeagueState } from '@/game/models/league'
import type { Player } from '@/game/models/player'
import type { Team } from '@/game/models/team'
import type { TeamDirection } from '@/game/models/team'
import type { TeamStanding } from '@/game/models/game'

export function updateAITeamDirection(
  team: Team,
  standings: { wins: number; losses: number } | undefined,
  league: LeagueState,
): TeamDirection {
  if (team.id === league.userTeamId) return team.direction

  const wins = standings?.wins ?? 41
  const losses = standings?.losses ?? 41
  const totalGames = wins + losses
  if (totalGames === 0) return team.direction

  const winPct = wins / totalGames
  const sorted = Object.values(league.standings).sort((a, b) => b.wins - a.wins)
  let rank = sorted.findIndex((s) => s.teamId === team.id) + 1
  if (rank === 0) {
    rank = team.direction === 'contender' ? 2 : 21
  }

  const rosterPlayers = team.roster
    .map((id) => league.players[id])
    .filter((p): p is Player => Boolean(p))
  const avgAge =
    rosterPlayers.length > 0
      ? rosterPlayers.reduce((sum, p) => sum + p.age, 0) / rosterPlayers.length
      : 27

  if (rank <= 4 && avgAge > 28) return 'contender'
  if (rank > 20 && avgAge < 26) {
    return winPct < 0.3 ? 'tanking' : 'rebuilding'
  }
  if (rank > 14) return 'playoff_push'
  if (rank > 8) return 'playoff_push'
  return 'middle'
}

export function directionChangeReason(
  from: TeamDirection,
  to: TeamDirection,
  standing: TeamStanding | undefined,
  avgAge: number,
): string {
  if (from === to) return ''
  const record = standing ? `${standing.wins}-${standing.losses}` : 'unknown record'
  if (to === 'contender') {
    return `Top-four finish (${record}) with veteran core (avg age ${avgAge.toFixed(1)})`
  }
  if (to === 'rebuilding' || to === 'tanking') {
    return `Bottom-tier finish (${record}) with young roster (avg age ${avgAge.toFixed(1)})`
  }
  if (to === 'retooling') return `Middle-of-pack finish (${record}) prompts roster retool`
  if (to === 'playoff_push') return `Play-in range (${record}) — pushing for postseason`
  return `Standing shift (${record})`
}
