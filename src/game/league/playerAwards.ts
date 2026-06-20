import type { LeagueState } from '@/game/models/league'
import type { AwardWinner } from '@/game/models/award'
import { AWARD_SHORT_LABELS } from '@/game/models/award'

export function getPlayerAwards(
  league: LeagueState,
  playerId: string,
): AwardWinner[] {
  const out: AwardWinner[] = []
  for (const season of league.awardsHistory) {
    for (const award of season.awards) {
      if (award.playerId === playerId) {
        out.push(award)
      }
    }
  }
  return out.sort((a, b) => b.season.localeCompare(a.season))
}

export function formatAwardChip(award: AwardWinner): string {
  return `${AWARD_SHORT_LABELS[award.award]} (${award.season})`
}
