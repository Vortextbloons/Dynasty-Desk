import type {
  LineupSettings,
  RotationValidation,
  RotationValidationWarning,
  RotationWarning,
} from '@/game/models/team'
import type { Player } from '@/game/models/player'

const INJURED_STATUSES = new Set([
  'day_to_day',
  'short_term',
  'long_term',
  'season_ending',
])

const MINUTES_TOLERANCE = 2
const BENCH_SOFT_CAP = 10
const BALL_HANDLER_BH_MIN = 65
const BALL_HANDLER_PASS_MIN = 60
const CENTER_ID_MIN = 60
const TOTAL_MINUTES = 240

export function isBallHandler(p: Player): boolean {
  return (
    p.ratings.ballHandling >= BALL_HANDLER_BH_MIN &&
    p.ratings.passing >= BALL_HANDLER_PASS_MIN
  )
}

export function isCenterOrPF(p: Player): boolean {
  return (
    (p.position === 'C' || p.position === 'PF') &&
    p.ratings.interiorDefense >= CENTER_ID_MIN
  )
}

export function isInjured(p: Player): boolean {
  return INJURED_STATUSES.has(p.health.status)
}

function hasPlayer(players: Map<string, Player>, id: string): boolean {
  return players.has(id)
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const dups: string[] = []
  for (const id of ids) {
    if (seen.has(id)) dups.push(id)
    seen.add(id)
  }
  return dups
}

function addWarning(
  warnings: RotationValidationWarning[],
  code: RotationWarning,
  message: string,
  playerIds?: string[],
): void {
  warnings.push({ code, message, playerIds })
}

export function validateRotation(
  teamRoster: string[],
  lineup: LineupSettings,
  players: Map<string, Player>,
  forceInclude?: Record<string, boolean>,
): RotationValidation {
  const warnings: RotationValidationWarning[] = []
  const rosterSet = new Set(teamRoster)

  if (lineup.starters.length !== 5) {
    addWarning(
      warnings,
      'not_five_starters',
      `Expected 5 starters, got ${lineup.starters.length}.`,
    )
  }

  if (lineup.closingLineup.length !== 5) {
    addWarning(
      warnings,
      'not_five_closing',
      `Expected 5 closing lineup players, got ${lineup.closingLineup.length}.`,
    )
  }

  const allRotationIds = new Set<string>()
  const duplicates: string[] = []

  for (const id of lineup.starters) {
    if (!hasPlayer(players, id) || !rosterSet.has(id)) {
      addWarning(warnings, 'player_not_on_roster', `Player ${id} is not on the roster.`, [id])
    }
    if (allRotationIds.has(id)) {
      duplicates.push(id)
    }
    allRotationIds.add(id)
  }

  for (const id of lineup.bench) {
    if (!hasPlayer(players, id) || !rosterSet.has(id)) {
      addWarning(warnings, 'player_not_on_roster', `Player ${id} is not on the roster.`, [id])
    }
    if (allRotationIds.has(id)) {
      duplicates.push(id)
    }
    allRotationIds.add(id)
  }

  for (const id of lineup.closingLineup) {
    if (!hasPlayer(players, id) || !rosterSet.has(id)) {
      addWarning(warnings, 'player_not_on_roster', `Player ${id} is not on the roster.`, [id])
    }
  }

  const closingDuplicates = findDuplicates(lineup.closingLineup)
  if (closingDuplicates.length > 0) {
    addWarning(
      warnings,
      'duplicate_player',
      `Player(s) appear more than once in closing lineup: ${closingDuplicates.join(', ')}.`,
      closingDuplicates,
    )
  }

  if (duplicates.length > 0) {
    addWarning(
      warnings,
      'duplicate_player',
      `Player(s) appear in both starters and bench: ${duplicates.join(', ')}.`,
      duplicates,
    )
  }

  let totalMinutes = 0
  const rotationIds = [...lineup.starters, ...lineup.bench]
  for (const id of rotationIds) {
    totalMinutes += lineup.targetMinutes[id] ?? 0
  }

  if (Math.abs(totalMinutes - TOTAL_MINUTES) > MINUTES_TOLERANCE) {
    addWarning(
      warnings,
      'minutes_not_240',
      `Target minutes sum to ${totalMinutes}, expected ~${TOTAL_MINUTES}.`,
    )
  }

  const fi = forceInclude ?? {}
  const injuredInRotation: string[] = []
  const injuredForceIncluded: string[] = []

  for (const id of rotationIds) {
    const player = players.get(id)
    if (!player) continue
    if (isInjured(player)) {
      if (fi[id]) {
        injuredForceIncluded.push(id)
      } else {
        injuredInRotation.push(id)
      }
    }
  }

  if (injuredInRotation.length > 0) {
    addWarning(
      warnings,
      'injured_player_in_rotation',
      `Injured player(s) in rotation: ${injuredInRotation.join(', ')}.`,
      injuredInRotation,
    )
  }

  if (injuredForceIncluded.length > 0) {
    addWarning(
      warnings,
      'injured_player_force_included',
      `Injured player(s) force-included: ${injuredForceIncluded.join(', ')}.`,
      injuredForceIncluded,
    )
  }

  const hasBallHandler = lineup.starters.some((id) => {
    const p = players.get(id)
    return p && isBallHandler(p)
  })
  if (!hasBallHandler && lineup.starters.length === 5) {
    addWarning(
      warnings,
      'no_ball_handler',
      'No ball handler (BH ≥ 65, Pass ≥ 60) in starting lineup.',
    )
  }

  const hasCenter = lineup.starters.some((id) => {
    const p = players.get(id)
    return p && isCenterOrPF(p)
  })
  if (!hasCenter && lineup.starters.length === 5) {
    addWarning(
      warnings,
      'no_center',
      'No center or PF (ID ≥ 60) in starting lineup.',
    )
  }

  if (lineup.bench.length > BENCH_SOFT_CAP) {
    addWarning(
      warnings,
      'bench_too_large',
      `Bench has ${lineup.bench.length} players (soft cap is ${BENCH_SOFT_CAP}).`,
    )
  }

  return {
    ok: warnings.length === 0,
    warnings,
    totalMinutes,
  }
}
