// ============================================================================
// Centralized Sim Constants — M12
// Extracted from individual sim files for calibration and tuning.
// ============================================================================

// --- Possession & Pace ---
export const BASE_PACE = 100
export const BASE_3PA_RATE = 0.35
export const BASE_TOV_RATE = 0.13
export const TRANSITION_PROBABILITY = 0.18
export const BASE_TIME_SECONDS = 15

// --- Home Court ---
export const HOME_WIN_BONUS = 0.02
export const HOME_MAKE_BONUS = 0.02

// --- Shot Zones (base make percentages) ---
export const BASE_ZONE_PCT = {
  at_rim: 0.65,
  short_mid: 0.42,
  long_mid: 0.39,
  corner_three: 0.39,
  above_break_three: 0.36,
} as const

// --- Shot Model ---
export const CLUTCH_BONUS = 0.03
export const CONTEST_PENALTY_MAX = 0.18
export const SPACING_BONUS_MAX = 0.06
export const PASSER_BONUS_MAX = 0.05
export const SHOT_QUALITY_BASE_BONUS = 0.04
export const SKILL_ADJUSTMENT_RANGE = 0.18

// --- Shot Clock ---
export const SHOT_CLOCK_SECONDS = 24
export const TRANSITION_SHOT_CLOCK = 18
export const LATE_CLOCK_THRESHOLD = 4
export const RUSH_CHANCE_LATE = 0.85
export const RUSH_CHANCE_NORMAL = 0.15

// --- Rebounds ---
export const BASE_OREB_CHANCE = 0.26
export const OREB_CLAMP_MIN = 0.18
export const OREB_CLAMP_MAX = 0.34
export const SHORT_REBOUND_BONUS = 0.04
export const LONG_REBOUND_PENALTY = 0.04

// --- Fouls ---
export const SHOOTING_FOUL_BASE = 0.04
export const SHOOTING_FOUL_CLAMP_MIN = 0.02
export const SHOOTING_FOUL_CLAMP_MAX = 0.25
export const NON_SHOOTING_FOUL_BASE = 0.05
export const NON_SHOOTING_FOUL_CLAMP_MIN = 0.02
export const NON_SHOOTING_FOUL_CLAMP_MAX = 0.15
export const OFFENSIVE_FOUL_BASE = 0.04
export const OFFENSIVE_FOUL_CLAMP_MIN = 0.01
export const OFFENSIVE_FOUL_CLAMP_MAX = 0.08
export const NON_SHOOTING_FOUL_RATE = 0.08
export const FLAGRANT_CHANCE = 0.005
export const TECHNICAL_CHANCE = 0.003
export const FOUL_OUT_LIMIT = 6
export const BONUS_FOULS_REGULATION = 5
export const BONUS_FOULS_OT = 2
export const BONUS_FOULS_LAST_TWO_MIN = 2

// --- Turnovers ---
export const TURNOVER_IMPACT = 35
export const STEAL_PROBABILITY_ON_TO = 0.30
export const STEAL_THRESHOLD = 55

// --- Fatigue ---
export const FATIGUE_GAIN_PER_MINUTE = 2.8
export const FATIGUE_HIGH_USAGE_MULTIPLIER = 1.2
export const FATIGUE_PENALTY_THRESHOLD = 50
export const FATIGUE_SHOOTING_DEFENSE_SCALE = 0.001
export const FATIGUE_TO_FOUL_SCALE = 0.0008
export const FATIGUE_RECOVERY_PER_DAY = 12

// --- Injury ---
export const INJURY_RATE_PER_GAME = 0.005
export const INJURY_CLAMP_MIN = 0.001
export const INJURY_CLAMP_MAX = 0.03
export const INJURY_FATIGUE_THRESHOLD = 70
export const INJURY_MINUTES_THRESHOLD = 38
export const INJURY_FATIGUE_MULTIPLIER = 1.5
export const INJURY_MINUTES_MULTIPLIER = 1.3
export const INJURY_B2B_MULTIPLIER = 1.2
export const INJURY_AGE_MULTIPLIER = 1.15

// --- Clutch ---
export const CLUTCH_WINDOW_SECONDS = 300
export const CLUTCH_MARGIN = 5
export const STAR_CLUTCH_BONUS = 0.05
export const LOW_CLUTCH_PENALTY = 0.03

// --- Strategy ---
export const FAST_PACE_TIME_MULT = 0.92
export const SLOW_PACE_TIME_MULT = 1.08
export const FAST_PACE_EXTRA_POSSESSIONS = 5
export const SLOW_PACE_EXTRA_POSSESSIONS = -4
export const THREE_HEAVY_3PA_BONUS = 0.12
export const THREE_HEAVY_3PT_MAKE_BONUS = 0.02
export const PAINT_RIM_BONUS = 0.08
export const PAINT_FT_BONUS = 0.03
export const PAINT_3PA_PENALTY = -0.06
export const HIGH_PRESSURE_STEAL_BONUS = 0.02
export const HIGH_PRESSURE_FOUL_BONUS = 0.03
export const LOW_PRESSURE_STEAL_PENALTY = -0.01
export const LOW_PRESSURE_FOUL_PENALTY = -0.01
export const HIGH_CRASH_OREB_BONUS = 0.03
export const HIGH_CRASH_TRANSITION_PENALTY = 0.02
export const LOW_CRASH_OREB_PENALTY = -0.02
export const LOW_CRASH_TRANSITION_PENALTY = -0.01

// --- Substitution ---
export const FOUL_LIMIT = 5
export const MIN_BENCH_FOR_SUB = 1
export const SUB_INTERVAL_SECONDS = 60

// --- Game Clock ---
export const QUARTER_SECONDS = 720
export const OT_SECONDS = 300
export const MAX_POSSESSIONS_PER_PERIOD = 200

// --- Morale ---
export const MORALE_MINUTES_UNDER_THRESHOLD = -8
export const MORALE_MINUTES_OVER_THRESHOLD = 8
export const MORALE_TRADE_REQUEST_THRESHOLD = 80

// --- Chemistry ---
export const CHEM_WIN_STREAK_THRESHOLD = 5
export const CHEM_LOSE_STREAK_THRESHOLD = 5
export const CHEM_WIN_STREAK_BONUS = 5
export const CHEM_LOSE_STREAK_PENALTY = 6

// --- Development ---
export const DEV_YOUNG_GROWTH_MIN = 0.5
export const DEV_YOUNG_GROWTH_MAX = 2.0
export const DEV_PRIME_GROWTH_MIN = 0
export const DEV_PRIME_GROWTH_MAX = 1.0
export const DEV_PLATEAU_MIN = -0.5
export const DEV_PLATEAU_MAX = 0.5
export const DEV_DECLINE_MIN = -2.0
export const DEV_DECLINE_MAX = -0.5
export const DEV_EARLY_CURVE_MULT = 1.2
export const DEV_LATE_CURVE_MULT = 0.85
export const DEV_VETERAN_DECLINE_MULT = 1.3

// --- Clock Awareness ---
export const HOLD_FOR_LAST_SHOT_THRESHOLD = 26
export const TWO_FOR_ONE_MIN = 32
export const TWO_FOR_ONE_MAX = 52
export const INTENTIONAL_FOUL_WINDOW = 27
export const RUN_OUT_CLOCK_THRESHOLD = 24
export const CATCH_UP_DEFICIT_MIN = 3
export const CATCH_UP_DEFICIT_MAX = 15
export const CATCH_UP_CLOCK_MAX = 180
export const MAINTAIN_LEAD_DEFICIT_MIN = 3
export const MAINTAIN_LEAD_DEFICIT_MAX = 10
export const MAINTAIN_LEAD_CLOCK_MAX = 180
export const HOLD_FOR_LAST_SHOT_MEAN_PACE = 22
export const TWO_FOR_ONE_MEAN_PACE = 6.25
export const CATCH_UP_MEAN_PACE = 5
export const MAINTAIN_LEAD_MEAN_PACE = 12
export const NORMAL_MEAN_PACE = 12.5
export const INTENTIONAL_FOUL_MIN_SCORE_DIFF = 1
export const INTENTIONAL_FOUL_MAX_SCORE_DIFF = 6
export const TIMEOUT_CLOCK_THRESHOLD = 10
export const TIMEOUT_DEFICIT_MAX = 10
export const FINAL_PERIOD = 4

// --- Key Plays ---
export const KEY_PLAYS_LIMIT = 5
