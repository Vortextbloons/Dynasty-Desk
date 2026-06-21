export const MIN_DAYS_BETWEEN_SAME_OPPONENT = 2
export const SEASON_LENGTH_DAYS = 170
export const GAMES_PER_FRAME_INSTANT = 10
export const GAMES_PER_FRAME_NORMAL = 1
export const NORMAL_SIM_DELAY_MS = 150
/** Target wall-clock duration for a full fast-forward game view. */
export const LIVE_SIM_TARGET_GAME_MS = 2_500
/** Typical possession count used to derive per-tick delay. */
export const LIVE_SIM_ESTIMATED_POSSESSIONS = 180
/** Delay between possessions when watching a game in fast-forward (normal) mode. */
export const LIVE_SIM_POSSESSION_DELAY_MS = Math.max(
  8,
  Math.floor(LIVE_SIM_TARGET_GAME_MS / LIVE_SIM_ESTIMATED_POSSESSIONS),
)
