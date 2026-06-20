export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export const POSITIONS: readonly Position[] = ["PG", "SG", "SF", "PF", "C"] as const;

export function isPosition(value: unknown): value is Position {
  return typeof value === "string" && (POSITIONS as readonly string[]).includes(value);
}
