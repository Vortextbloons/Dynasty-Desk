import type { LineupSettings } from '@/game/models/team'
import type { Player } from '@/game/models/player'
import {
  validateRotation,
  isBallHandler,
  isCenterOrPF,
} from './rotationValidator'

const TOTAL_MINUTES = 240
const MAX_RETRIES = 3

function sortByOverall(a: Player, b: Player): number {
  return b.ratings.overall - a.ratings.overall
}

function twoWayScore(p: Player): number {
  return (
    p.ratings.overall * 0.4 +
    p.ratings.perimeterDefense * 0.15 +
    p.ratings.interiorDefense * 0.1 +
    p.ratings.defensiveIq * 0.15 +
    p.ratings.freeThrow * 0.1 +
    p.ratings.clutch * 0.1
  )
}

function positionGroups(p: Player): string[] {
  const groups: string[] = []
  const pos = p.position
  const sec = p.secondaryPositions ?? []
  const all = [pos, ...sec]
  if (all.some((x) => x === 'PG' || x === 'SG')) groups.push('guard')
  if (all.some((x) => x === 'SG' || x === 'SF')) groups.push('wing')
  if (all.some((x) => x === 'PF' || x === 'C')) groups.push('big')
  return groups
}

function starterPositionalBalance(
  starters: Player[],
  bench: Player[],
): Player[] {
  const groupCounts = { guard: 0, wing: 0, big: 0 }
  for (const p of starters) {
    for (const g of positionGroups(p)) {
      groupCounts[g as keyof typeof groupCounts]++
    }
  }

  const worstByGroup: Record<string, Player | undefined> = {
    guard: undefined,
    wing: undefined,
    big: undefined,
  }
  for (const p of starters) {
    const groups = positionGroups(p)
    for (const g of groups) {
      const key = g as keyof typeof worstByGroup
      if (!worstByGroup[key] || sortByOverall(p, worstByGroup[key]!) > 0) {
        worstByGroup[key] = p
      }
    }
  }

  for (const group of ['guard', 'wing', 'big'] as const) {
    if (groupCounts[group] >= 2) continue

    const missingGroup = group
    const best = bench.find((p) => {
      const groups = positionGroups(p)
      return groups.includes(missingGroup)
    })
    if (!best) continue

    const worst = worstByGroup[group]
    if (!worst || worst.id === best.id) continue
    if (!starters.includes(worst)) continue

    const starterIdx = starters.findIndex((s) => s.id === worst.id)
    if (starterIdx === -1) continue
    starters[starterIdx] = best
    break
  }

  return starters
}

function pickStarters(
  candidates: Player[],
): Player[] {
  const sorted = [...candidates].sort(sortByOverall)
  let starters = sorted.slice(0, 5)

  const hasBallHandler = starters.some(isBallHandler)
  const hasCenter = starters.some(isCenterOrPF)

  if (!hasCenter) {
    const bestCenter = sorted.find(
      (p) => isCenterOrPF(p) && !starters.includes(p),
    )
    if (bestCenter) {
      const worstNonCenter = [...starters]
        .filter((p) => !isCenterOrPF(p))
        .sort(sortByOverall)[0]
        if (worstNonCenter) {
          starters = starters.filter((p) => p.id !== worstNonCenter.id)
          starters.push(bestCenter)
        }
    }
  }

  if (!hasBallHandler) {
    const bestBallHandler = sorted.find(
      (p) => isBallHandler(p) && !starters.includes(p),
    )
    if (bestBallHandler) {
      const worstNonBH = [...starters]
        .filter((p) => !isBallHandler(p))
        .sort(sortByOverall)[0]
      if (worstNonBH) {
        starters = starters.filter((p) => p.id !== worstNonBH.id)
        starters.push(bestBallHandler)
      }
    }
  }

  const bench = candidates.filter((p) => !starters.includes(p))
  return starterPositionalBalance(starters, bench)
}

function pickClosingLineup(
  starters: Player[],
  bench: Player[],
): Player[] {
  const pool = [...starters, ...bench]
  return pool.sort((a, b) => twoWayScore(b) - twoWayScore(a)).slice(0, 5)
}

function swapStarterWithBench(
  lineup: LineupSettings,
  benchPlayers: Player[],
  hasRole: (p: Player) => boolean,
  lacksRole: (p: Player) => boolean,
  players: Map<string, Player>,
): void {
  const rolePresent = lineup.starters.some((id) => {
    const p = players.get(id)
    return p && hasRole(p)
  })
  if (rolePresent) return

  const best = benchPlayers.filter(hasRole).sort(sortByOverall)[0]
  if (!best) return

  const worst = lineup.starters
    .map((id) => players.get(id))
    .filter((p): p is Player => p != null && lacksRole(p))
    .sort((a, b) => sortByOverall(a, b))[0]
  if (!worst) return

  const starterIndex = lineup.starters.indexOf(worst.id)
  const benchIndex = lineup.bench.indexOf(best.id)
  if (starterIndex === -1 || benchIndex === -1) return

  lineup.starters[starterIndex] = best.id
  lineup.bench[benchIndex] = worst.id
}

const STARTER_MIN = 24
const STARTER_MAX = 38
const BENCH_MIN = 4
const BENCH_MAX = 30
const STARTER_SHARE = 0.70

function minuteWeight(p: Player): number {
  return Math.pow(p.ratings.overall, 1.3)
}

function staminaModifier(p: Player): number {
  if (p.ratings.stamina >= 80) return 1
  if (p.ratings.stamina <= 45) return -1
  return 0
}

function distributeMinutes(
  group: Player[],
  share: number,
  min: number,
  max: number,
  minutes: Record<string, number>,
): void {
  if (group.length === 0) return

  const total = Math.round(TOTAL_MINUTES * share)
  const weights = group.map((p) => minuteWeight(p))
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum === 0) {
    const each = Math.floor(total / group.length)
    for (const p of group) minutes[p.id] = each
    return
  }

  for (let i = 0; i < group.length; i++) {
    const raw = (weights[i]! / weightSum) * total
    minutes[group[i]!.id] = Math.round(Math.max(min, Math.min(max, raw)))
  }

  let sum = group.reduce((a, p) => a + (minutes[p.id] ?? 0), 0)
  const diff = total - sum
  if (diff > 0) {
    const sorted = [...group].sort(
      (a, b) => minuteWeight(b) - minuteWeight(a),
    )
    let remaining = diff
    for (const p of sorted) {
      if (remaining <= 0) break
      const add = Math.min(remaining, max - (minutes[p.id] ?? 0))
      minutes[p.id] = (minutes[p.id] ?? 0) + add
      remaining -= add
    }
  } else if (diff < 0) {
    const sorted = [...group].sort(
      (a, b) => minuteWeight(a) - minuteWeight(b),
    )
    let remaining = -diff
    for (const p of sorted) {
      if (remaining <= 0) break
      const current = minutes[p.id] ?? 0
      const remove = Math.min(remaining, current - min)
      minutes[p.id] = current - remove
      remaining -= remove
    }
  }
}

function assignMinutes(
  starters: Player[],
  bench: Player[],
): Record<string, number> {
  const minutes: Record<string, number> = {}

  distributeMinutes(starters, STARTER_SHARE, STARTER_MIN, STARTER_MAX, minutes)
  distributeMinutes(bench, 1 - STARTER_SHARE, BENCH_MIN, BENCH_MAX, minutes)

  let total = Object.values(minutes).reduce((a, b) => a + b, 0)
  const gap = TOTAL_MINUTES - total
  if (gap !== 0) {
    const sorted = [...starters, ...bench].sort(
      (a, b) => minuteWeight(b) - minuteWeight(a),
    )
    let remaining = gap
    for (const p of sorted) {
      if (remaining === 0) break
      const current = minutes[p.id] ?? 0
      if (gap > 0) {
        const add = Math.min(remaining, STARTER_MAX - current)
        minutes[p.id] = current + add
        remaining -= add
      } else {
        const bound = starters.includes(p) ? STARTER_MIN : BENCH_MIN
        const remove = Math.min(-remaining, current - bound)
        minutes[p.id] = current - remove
        remaining += remove
      }
    }
  }

  for (const p of [...starters, ...bench]) {
    const mod = staminaModifier(p)
    if (mod !== 0) {
      const current = minutes[p.id] ?? 0
      const min = starters.includes(p) ? STARTER_MIN : BENCH_MIN
      const max = STARTER_MAX
      minutes[p.id] = Math.max(min, Math.min(max, current + mod))
    }
  }

  return minutes
}

export function generateAutoRotation(
  roster: string[],
  players: Map<string, Player>,
): LineupSettings {
  const active = roster
    .map((id) => players.get(id))
    .filter((p): p is Player => Boolean(p))
    .filter((p) => p.health.status !== 'season_ending')
    .sort(sortByOverall)

  const starters = pickStarters(active)
  const starterIds = new Set(starters.map((p) => p.id))
  const bench = active.filter((p) => !starterIds.has(p.id))
  const closingLineup = pickClosingLineup(starters, bench)
  const targetMinutes = assignMinutes(starters, bench)

  const lineup: LineupSettings = {
    starters: starters.map((p) => p.id),
    bench: bench.map((p) => p.id),
    closingLineup: closingLineup.map((p) => p.id),
    targetMinutes,
    autoRotation: true,
    generatedByAutoRotate: true,
    lastValidatedAt: new Date().toISOString(),
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const validation = validateRotation(
      roster,
      lineup,
      players,
    )
    lineup.lastValidationWarnings = validation.warnings.map((w) => w.code)
    if (validation.ok) break

    const benchPlayers = lineup.bench
      .map((id) => players.get(id))
      .filter((p): p is Player => Boolean(p))

    swapStarterWithBench(lineup, benchPlayers, isBallHandler, (p) => !isBallHandler(p), players)
    swapStarterWithBench(lineup, benchPlayers, isCenterOrPF, (p) => !isCenterOrPF(p), players)

    const totalMin = Object.values(lineup.targetMinutes).reduce((a, b) => a + b, 0)
    if (Math.abs(totalMin - TOTAL_MINUTES) > 2) {
      const diff = TOTAL_MINUTES - totalMin
      const ids = [...lineup.starters, ...lineup.bench]
      const sorted = ids
        .map((id) => ({ id, minutes: lineup.targetMinutes[id] ?? 0 }))
        .sort((a, b) => b.minutes - a.minutes)
      if (diff > 0) {
        let remaining = diff
        for (const entry of sorted) {
          if (remaining <= 0) break
          const add = Math.min(remaining, 4)
          lineup.targetMinutes[entry.id] = entry.minutes + add
          remaining -= add
        }
      } else if (diff < 0) {
        let remaining = -diff
        for (const entry of sorted) {
          if (remaining <= 0) break
          const remove = Math.min(remaining, Math.max(0, entry.minutes - 6))
          lineup.targetMinutes[entry.id] = entry.minutes - remove
          remaining -= remove
        }
      }
    }
  }

  return lineup
}
