import type { DraftProspect } from '@/game/models/draft'
import type { TeamScoutingState } from '@/game/models/draft'
import type { PlayerRatings } from '@/game/models/ratings'
import { clampRating } from '@/game/models/ratings'

export const SCOUTING_POINTS_PER_TEAM = 100

export function initScoutingState(
  teamId: string,
  draftClassId: string,
): TeamScoutingState {
  return {
    teamId,
    draftClassId,
    pointsRemaining: SCOUTING_POINTS_PER_TEAM,
    allocations: {},
  }
}

export function allocateScoutingPoints(
  state: TeamScoutingState,
  prospect: DraftProspect,
  points: number,
): {
  state: TeamScoutingState
  visibleRatings: Partial<PlayerRatings>
  visiblePotentialRange: [number, number]
} | { error: string } {
  if (points <= 0) return { error: 'Must allocate at least 1 point.' }
  if (points > state.pointsRemaining) {
    return { error: 'Not enough scouting points remaining.' }
  }

  const prev = state.allocations[prospect.id] ?? 0
  const total = prev + points
  const nextState: TeamScoutingState = {
    ...state,
    pointsRemaining: state.pointsRemaining - points,
    allocations: { ...state.allocations, [prospect.id]: total },
  }

  const visibility = computeVisibility(prospect, total)
  prospect.scoutingPoints = total
  prospect.scoutedByTeamId = state.teamId
  prospect.visibleRatings = visibility.visibleRatings
  prospect.visiblePotentialRange = visibility.visiblePotentialRange

  return {
    state: nextState,
    visibleRatings: visibility.visibleRatings,
    visiblePotentialRange: visibility.visiblePotentialRange,
  }
}

export function computeVisibility(
  prospect: DraftProspect,
  points: number,
): {
  visibleRatings: Partial<PlayerRatings>
  visiblePotentialRange: [number, number]
} {
  const fraction = Math.min(1, points / SCOUTING_POINTS_PER_TEAM)
  const visibleRatings: Partial<PlayerRatings> = {}
  const ratingKeys = Object.keys(prospect.trueRatings) as (keyof PlayerRatings)[]

  for (const key of ratingKeys) {
    if (key === 'overall' || key === 'potential') continue
    const trueVal = prospect.trueRatings[key]
    const noise = Math.round((1 - fraction) * 12)
    visibleRatings[key] = clampRating(
      fraction >= 0.95 ? trueVal : trueVal + (noise % 2 === 0 ? noise : -noise) * 0.5,
    )
  }

  if (fraction >= 0.95) {
    visibleRatings.overall = prospect.trueRatings.overall
  } else {
    const avg = Object.values(visibleRatings).reduce((a, b) => a + (b ?? 50), 0) /
      Math.max(1, Object.keys(visibleRatings).length)
    visibleRatings.overall = clampRating(avg)
  }

  const potSpread = Math.round((1 - fraction) * 20)
  const low = clampRating(prospect.truePotential - potSpread)
  const high = clampRating(prospect.truePotential + potSpread)
  const visiblePotentialRange: [number, number] = [low, high]

  return { visibleRatings, visiblePotentialRange }
}
