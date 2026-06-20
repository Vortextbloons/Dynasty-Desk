export type PlayerRatings = {
  insideScoring: number;
  closeShot: number;
  midrange: number;
  threePoint: number;
  freeThrow: number;

  ballHandling: number;
  passing: number;
  offensiveIq: number;

  offensiveRebound: number;
  defensiveRebound: number;

  perimeterDefense: number;
  interiorDefense: number;
  steal: number;
  block: number;
  defensiveIq: number;

  speed: number;
  strength: number;
  vertical: number;
  stamina: number;
  durability: number;

  clutch: number;
  consistency: number;
  potential: number;
};

export const RATING_MIN = 0;
export const RATING_MAX = 100;
export const RATING_REPLACEMENT = 50;
export const RATING_BENCH = 60;
export const RATING_STARTER = 70;
export const RATING_ALL_STAR = 80;
export const RATING_ELITE = 90;

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return RATING_REPLACEMENT;
  if (value < RATING_MIN) return RATING_MIN;
  if (value > RATING_MAX) return RATING_MAX;
  return Math.round(value);
}
