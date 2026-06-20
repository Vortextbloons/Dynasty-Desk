import type { LeagueState } from '@/game/models/league'

export function recomputeStepienFlags(league: LeagueState): void {
  const teamsById = league.teams
  const teamIds = Object.keys(teamsById)

  const ownedByTeam: Record<string, Array<{ year: number; round: number }>> = {}
  for (const teamId of teamIds) {
    ownedByTeam[teamId] = []
  }
  for (const pick of league.draftPicks) {
    if (!ownedByTeam[pick.currentTeamId]) continue
    if (pick.round !== 1) continue
    const year = parseSeasonStartYear(pick.season)
    if (!year) continue
    ownedByTeam[pick.currentTeamId]!.push({ year, round: pick.round })
  }

  for (const pick of league.draftPicks) {
    if (pick.round !== 1) continue
    const years = ownedByTeam[pick.currentTeamId] ?? []
    if (years.length === 0) {
      pick.stepienBlocked = false
      continue
    }
    const min = years.reduce((m, y) => Math.min(m, y.year), Infinity)
    const max = years.reduce((m, y) => Math.max(m, y.year), -Infinity)
    const pickYear = parseSeasonStartYear(pick.season)
    if (!pickYear) {
      pick.stepienBlocked = false
      continue
    }
    const minYearsHeld = pickYear - min
    const maxYearsHeld = max - pickYear
    const heldBackByMin = minYearsHeld < 2
    const heldBackByMax = maxYearsHeld < 2
    pick.stepienBlocked = heldBackByMin || heldBackByMax
  }
}

function parseSeasonStartYear(season: string): number {
  const m = season.match(/^(\d{4})/)
  return m ? Number(m[1]) : 0
}
