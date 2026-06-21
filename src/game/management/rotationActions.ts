import type { LineupSettings } from '@/game/models/team'

export const BENCH_SOFT_CAP = 15
export const TOTAL_ROTATION_MINUTES = 240
export const STARTER_SLOT_COUNT = 5

export type RotationSection = 'pool' | 'starter' | 'bench'

export function getRotationPlayerIds(lineup: LineupSettings): Set<string> {
  return new Set([...lineup.starters, ...lineup.bench])
}

export function getAvailablePlayerIds(
  roster: string[],
  lineup: LineupSettings,
): string[] {
  const inRotation = getRotationPlayerIds(lineup)
  return uniquePlayerIds(roster.filter((id) => !inRotation.has(id)))
}

/** Preserve order; drop duplicate player ids (first occurrence wins). */
export function uniquePlayerIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

export function computeRotationMinutesTotal(lineup: LineupSettings): number {
  let total = 0
  for (const id of getRotationPlayerIds(lineup)) {
    total += lineup.targetMinutes[id] ?? 0
  }
  return total
}

export function removeFromRotation(
  lineup: LineupSettings,
  playerId: string,
): LineupSettings {
  const { [playerId]: _removed, ...targetMinutes } = lineup.targetMinutes
  return {
    ...lineup,
    starters: lineup.starters.filter((id) => id !== playerId),
    bench: lineup.bench.filter((id) => id !== playerId),
    closingLineup: lineup.closingLineup.filter((id) => id !== playerId),
    targetMinutes,
  }
}

export function assignToStarter(
  lineup: LineupSettings,
  playerId: string,
  slotIndex?: number,
): LineupSettings {
  const next = removeFromRotation(lineup, playerId)
  const starters = [...next.starters]

  if (slotIndex !== undefined && slotIndex >= 0 && slotIndex < STARTER_SLOT_COUNT) {
    if (slotIndex < starters.length) {
      starters[slotIndex] = playerId
    } else if (starters.length < STARTER_SLOT_COUNT) {
      starters.push(playerId)
    } else {
      starters[slotIndex] = playerId
    }
  } else if (starters.length < STARTER_SLOT_COUNT) {
    starters.push(playerId)
  } else {
    starters[STARTER_SLOT_COUNT - 1] = playerId
  }

  return {
    ...next,
    starters: starters.slice(0, STARTER_SLOT_COUNT),
    targetMinutes: {
      ...next.targetMinutes,
      [playerId]: next.targetMinutes[playerId] ?? defaultStarterMinutes(),
    },
  }
}

export function assignToBench(
  lineup: LineupSettings,
  playerId: string,
  index?: number,
): LineupSettings {
  if (
    lineup.bench.length >= BENCH_SOFT_CAP &&
    !lineup.bench.includes(playerId) &&
    !lineup.starters.includes(playerId)
  ) {
    return lineup
  }

  let next = removeFromRotation(lineup, playerId)
  let bench = [...next.bench]

  if (index !== undefined && index >= 0 && index <= bench.length) {
    bench.splice(index, 0, playerId)
  } else {
    bench.push(playerId)
  }

  bench = bench.slice(0, BENCH_SOFT_CAP)

  return {
    ...next,
    bench,
    targetMinutes: {
      ...next.targetMinutes,
      [playerId]: next.targetMinutes[playerId] ?? defaultBenchMinutes(),
    },
  }
}

export function moveBetweenSections(
  lineup: LineupSettings,
  playerId: string,
  from: RotationSection,
  to: RotationSection,
  index?: number,
): LineupSettings {
  if (from === to) {
    if (from === 'starter' && index !== undefined) {
      return reorderStarter(lineup, playerId, index)
    }
    if (from === 'bench' && index !== undefined) {
      return reorderBench(lineup, playerId, index)
    }
    return lineup
  }

  if (to === 'pool') {
    return removeFromRotation(lineup, playerId)
  }

  if (to === 'starter') {
    return assignToStarter(lineup, playerId, index)
  }

  if (to === 'bench') {
    return assignToBench(lineup, playerId, index)
  }

  return lineup
}

function reorderStarter(
  lineup: LineupSettings,
  playerId: string,
  toIndex: number,
): LineupSettings {
  const starters = [...lineup.starters]
  const fromIndex = starters.indexOf(playerId)
  if (fromIndex === -1 || toIndex < 0 || toIndex >= STARTER_SLOT_COUNT) {
    return lineup
  }
  starters.splice(fromIndex, 1)
  const clamped = Math.min(toIndex, starters.length)
  starters.splice(clamped, 0, playerId)
  return { ...lineup, starters }
}

function reorderBench(
  lineup: LineupSettings,
  playerId: string,
  toIndex: number,
): LineupSettings {
  const bench = [...lineup.bench]
  const fromIndex = bench.indexOf(playerId)
  if (fromIndex === -1 || toIndex < 0 || toIndex >= bench.length) {
    return lineup
  }
  bench.splice(fromIndex, 1)
  bench.splice(toIndex, 0, playerId)
  return { ...lineup, bench }
}

export function balanceRotationMinutes(lineup: LineupSettings): LineupSettings {
  const rotationIds = [...getRotationPlayerIds(lineup)]
  if (rotationIds.length === 0) return lineup

  const targetMinutes = { ...lineup.targetMinutes }
  let total = computeRotationMinutesTotal(lineup)

  if (total === 0) {
    const perPlayer = Math.floor(TOTAL_ROTATION_MINUTES / rotationIds.length)
    let remaining = TOTAL_ROTATION_MINUTES
    for (let i = 0; i < rotationIds.length; i++) {
      const id = rotationIds[i]!
      const mins = i === rotationIds.length - 1 ? remaining : perPlayer
      targetMinutes[id] = mins
      remaining -= mins
    }
    return { ...lineup, targetMinutes, generatedByAutoRotate: false }
  }

  if (total === TOTAL_ROTATION_MINUTES) {
    return lineup
  }

  const diff = TOTAL_ROTATION_MINUTES - total
  const sorted = rotationIds
    .map((id) => ({ id, minutes: targetMinutes[id] ?? 0 }))
    .sort((a, b) => b.minutes - a.minutes)

  if (diff > 0) {
    let remaining = diff
    for (const entry of sorted) {
      if (remaining <= 0) break
      const add = Math.min(remaining, 4)
      targetMinutes[entry.id] = entry.minutes + add
      remaining -= add
    }
  } else {
    let remaining = -diff
    for (const entry of [...sorted].reverse()) {
      if (remaining <= 0) break
      const remove = Math.min(remaining, Math.max(0, entry.minutes - 6))
      targetMinutes[entry.id] = entry.minutes - remove
      remaining -= remove
    }
  }

  total = rotationIds.reduce((sum, id) => sum + (targetMinutes[id] ?? 0), 0)
  const finalDiff = TOTAL_ROTATION_MINUTES - total
  if (finalDiff !== 0 && sorted.length > 0) {
    const top = sorted[0]!
    targetMinutes[top.id] = (targetMinutes[top.id] ?? 0) + finalDiff
  }

  return { ...lineup, targetMinutes, generatedByAutoRotate: false }
}

function defaultStarterMinutes(): number {
  return 32
}

function defaultBenchMinutes(): number {
  return 12
}
