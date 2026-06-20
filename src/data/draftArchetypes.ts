import type { Position } from '@/game/models/position'
import type { PlayerRatings } from '@/game/models/ratings'
import { clampRating } from '@/game/models/ratings'

export interface DraftArchetype {
  id: string
  label: string
  positions: Position[]
  baseRatings: Partial<PlayerRatings>
  potentialRange: [number, number]
  bustRisk: number
  breakoutChance: number
}

export const DRAFT_ARCHETYPES: DraftArchetype[] = [
  {
    id: 'floor_general',
    label: 'Floor General',
    positions: ['PG'],
    baseRatings: { ballHandling: 78, passing: 80, offensiveIq: 75, perimeterDefense: 62, threePoint: 68 },
    potentialRange: [72, 88],
    bustRisk: 0.12,
    breakoutChance: 0.18,
  },
  {
    id: 'combo_guard',
    label: 'Combo Guard',
    positions: ['PG', 'SG'],
    baseRatings: { ballHandling: 72, threePoint: 74, midrange: 70, perimeterDefense: 65, speed: 75 },
    potentialRange: [70, 86],
    bustRisk: 0.15,
    breakoutChance: 0.16,
  },
  {
    id: 'sharpshooter',
    label: 'Sharpshooter',
    positions: ['SG', 'SF'],
    baseRatings: { threePoint: 82, freeThrow: 85, midrange: 72, perimeterDefense: 60, offBallMovement: 70 } as Partial<PlayerRatings>,
    potentialRange: [68, 84],
    bustRisk: 0.18,
    breakoutChance: 0.14,
  },
  {
    id: 'two_way_wing',
    label: 'Two-Way Wing',
    positions: ['SF', 'SG'],
    baseRatings: { perimeterDefense: 75, threePoint: 70, ballHandling: 65, steal: 72, speed: 74 },
    potentialRange: [72, 90],
    bustRisk: 0.1,
    breakoutChance: 0.2,
  },
  {
    id: 'slasher',
    label: 'Slasher',
    positions: ['SF', 'SG'],
    baseRatings: { insideScoring: 75, closeShot: 72, speed: 80, vertical: 78, ballHandling: 68 },
    potentialRange: [70, 87],
    bustRisk: 0.16,
    breakoutChance: 0.17,
  },
  {
    id: 'stretch_big',
    label: 'Stretch Big',
    positions: ['PF', 'C'],
    baseRatings: { threePoint: 76, midrange: 70, defensiveRebound: 68, interiorDefense: 65, strength: 72 },
    potentialRange: [70, 88],
    bustRisk: 0.14,
    breakoutChance: 0.18,
  },
  {
    id: 'rim_protector',
    label: 'Rim Protector',
    positions: ['C', 'PF'],
    baseRatings: { block: 82, interiorDefense: 78, defensiveRebound: 75, strength: 80, vertical: 74 },
    potentialRange: [72, 89],
    bustRisk: 0.11,
    breakoutChance: 0.19,
  },
  {
    id: 'post_scorer',
    label: 'Post Scorer',
    positions: ['C', 'PF'],
    baseRatings: { insideScoring: 78, closeShot: 76, strength: 82, offensiveRebound: 72, postMoves: 75 } as Partial<PlayerRatings>,
    potentialRange: [70, 86],
    bustRisk: 0.17,
    breakoutChance: 0.15,
  },
  {
    id: 'energy_big',
    label: 'Energy Big',
    positions: ['PF', 'C'],
    baseRatings: { offensiveRebound: 72, defensiveRebound: 70, vertical: 76, stamina: 80, interiorDefense: 65 },
    potentialRange: [65, 80],
    bustRisk: 0.2,
    breakoutChance: 0.12,
  },
  {
    id: 'versatile_forward',
    label: 'Versatile Forward',
    positions: ['PF', 'SF'],
    baseRatings: { midrange: 72, threePoint: 68, ballHandling: 62, defensiveRebound: 68, passing: 65 },
    potentialRange: [68, 85],
    bustRisk: 0.15,
    breakoutChance: 0.16,
  },
]

const REPLACEMENT = 50

export function buildRatingsFromArchetype(
  archetype: DraftArchetype,
  variance: number,
): PlayerRatings {
  const base: PlayerRatings = {
    insideScoring: REPLACEMENT,
    closeShot: REPLACEMENT,
    midrange: REPLACEMENT,
    threePoint: REPLACEMENT,
    freeThrow: REPLACEMENT + 5,
    ballHandling: REPLACEMENT,
    passing: REPLACEMENT,
    offensiveIq: REPLACEMENT,
    offensiveRebound: REPLACEMENT - 5,
    defensiveRebound: REPLACEMENT,
    perimeterDefense: REPLACEMENT,
    interiorDefense: REPLACEMENT,
    steal: REPLACEMENT,
    block: REPLACEMENT - 5,
    defensiveIq: REPLACEMENT,
    speed: REPLACEMENT,
    strength: REPLACEMENT,
    vertical: REPLACEMENT,
    stamina: REPLACEMENT + 5,
    durability: REPLACEMENT + 5,
    clutch: REPLACEMENT,
    consistency: REPLACEMENT,
    potential: REPLACEMENT,
    overall: REPLACEMENT,
  }

  for (const [key, value] of Object.entries(archetype.baseRatings)) {
    if (key in base && typeof value === 'number') {
      ;(base as unknown as Record<string, number>)[key] = clampRating(value + variance)
    }
  }

  const avg =
    (base.insideScoring +
      base.closeShot +
      base.midrange +
      base.threePoint +
      base.ballHandling +
      base.passing +
      base.perimeterDefense +
      base.interiorDefense) /
    8
  base.overall = clampRating(avg)
  return base
}

export function pickArchetypeForPosition(position: Position): DraftArchetype {
  const matches = DRAFT_ARCHETYPES.filter((a) => a.positions.includes(position))
  if (matches.length > 0) return matches[0]!
  return DRAFT_ARCHETYPES[0]!
}
