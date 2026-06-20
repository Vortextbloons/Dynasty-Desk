import type { LeagueState } from '@/game/models/league'
import type { Player } from '@/game/models/player'
import type { Team } from '@/game/models/team'

export const MAX_TWO_WAY_PLAYERS = 3
export const TWO_WAY_MAX_EXPERIENCE_YEARS = 2

export function canSignTwoWay(
  team: Team,
  player: Player,
): { canSign: boolean; reason?: string } {
  const current = team.twoWayPlayers?.length ?? 0
  if (current >= MAX_TWO_WAY_PLAYERS) {
    return { canSign: false, reason: 'Team already has 3 two-way players.' }
  }
  const yearsPro = player.age - 19
  if (yearsPro > TWO_WAY_MAX_EXPERIENCE_YEARS) {
    return { canSign: false, reason: 'Player has more than 2 years of experience.' }
  }
  if (team.roster.includes(player.id)) {
    return { canSign: false, reason: 'Player is already on the roster.' }
  }
  return { canSign: true }
}

export function isPlayoffEligible(playerId: string, league: LeagueState): boolean {
  for (const team of Object.values(league.teams)) {
    if (team?.twoWayPlayers?.includes(playerId)) return false
  }
  return true
}

export function addTwoWayPlayer(team: Team, playerId: string): void {
  if (!team.twoWayPlayers) team.twoWayPlayers = []
  if (!team.twoWayPlayers.includes(playerId)) {
    team.twoWayPlayers.push(playerId)
  }
}

export function removeTwoWayPlayer(team: Team, playerId: string): void {
  if (!team.twoWayPlayers) return
  team.twoWayPlayers = team.twoWayPlayers.filter((id) => id !== playerId)
}
