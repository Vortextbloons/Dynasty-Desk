import type { SeededRandom } from '@/game/sim/rng'

export const ROLE_PLAYER_ERUPTION_CHANCE = 0.02
export const SUPERSTAR_STINKER_CHANCE = 0.03
export const INJURY_ON_CONTACT_CHANCE = 0.01
export const ERUPTION_MAKE_BONUS = 0.15
export const ERUPTION_USAGE_BONUS = 0.20
export const STINKER_MAKE_PENALTY = -0.10
export const STINKER_TOV_BONUS = 0.05
export const PLAYOFF_STAR_MAKE_BONUS = 0.02
export const PLAYOFF_FATIGUE_REDUCTION = 0.8
export const ELIMINATION_CLUTCH_BONUS = 0.03
export const ELIMINATION_CHOKE_PENALTY = -0.02
export const ELIMINATION_CHOKE_TOV_BONUS = 0.02
export const CONSISTENCY_VARIANCE_SCALE = 0.005
export const CAREER_HIGH_MORALE_BOOST = 5
export const CAREER_HIGH_CHEMISTRY_BOOST = 3
export const PLAYOFF_UPSET_MORALE_BOOST = 5
export const PLAYOFF_UPSET_CHEMISTRY_BOOST = 3
export const PLAYOFF_UPSET_MORALE_PENALTY = -5
export const PLAYOFF_UPSET_CHEMISTRY_PENALTY = -3

export interface RandomGameEvents {
  eruptionPlayerId: string | null
  stinkerPlayerId: string | null
}

export function checkRolePlayerEruption(
  rng: SeededRandom,
  benchPlayerIds: string[],
): string | null {
  if (!rng.chance(ROLE_PLAYER_ERUPTION_CHANCE)) return null
  if (benchPlayerIds.length === 0) return null
  return rng.pick(benchPlayerIds)
}

export function checkSuperstarStinker(
  rng: SeededRandom,
  starPlayerIds: string[],
): string | null {
  if (!rng.chance(SUPERSTAR_STINKER_CHANCE)) return null
  if (starPlayerIds.length === 0) return null
  return rng.pick(starPlayerIds)
}

export function consistencyVariance(
  consistency: number,
  rng: SeededRandom,
): number {
  const spread = (50 - consistency) / 200
  const u1 = rng.next()
  const u2 = rng.next()
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2)
  return z * spread
}

export function playoffIntensityBonus(overall: number): number {
  if (overall >= 80) return PLAYOFF_STAR_MAKE_BONUS
  return 0
}

export function playoffFatigueReduction(): number {
  return PLAYOFF_FATIGUE_REDUCTION
}

export function eliminationGameEffects(clutch: number): {
  makeBonus: number
  tovBonus: number
} {
  if (clutch >= 75) {
    return { makeBonus: ELIMINATION_CLUTCH_BONUS, tovBonus: 0 }
  }
  if (clutch < 55) {
    return { makeBonus: ELIMINATION_CHOKE_PENALTY, tovBonus: ELIMINATION_CHOKE_TOV_BONUS }
  }
  return { makeBonus: 0, tovBonus: 0 }
}

export function checkInjuryOnContact(
  rng: SeededRandom,
  isAtRim: boolean,
): boolean {
  if (!isAtRim) return false
  return rng.chance(INJURY_ON_CONTACT_CHANCE)
}

export function playoffUpsetEffects(lowerSeedWon: boolean): {
  winnerMorale: number
  winnerChemistry: number
  loserMorale: number
  loserChemistry: number
} {
  if (lowerSeedWon) {
    return {
      winnerMorale: PLAYOFF_UPSET_MORALE_BOOST,
      winnerChemistry: PLAYOFF_UPSET_CHEMISTRY_BOOST,
      loserMorale: PLAYOFF_UPSET_MORALE_PENALTY,
      loserChemistry: PLAYOFF_UPSET_CHEMISTRY_PENALTY,
    }
  }
  return { winnerMorale: 0, winnerChemistry: 0, loserMorale: 0, loserChemistry: 0 }
}
