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

  return starters
}

function pickClosingLineup(
  starters: Player[],
  bench: Player[],
): Player[] {
  const pool = [...starters, ...bench.slice(0, 3)]
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

function assignMinutes(
  starters: Player[],
  bench: Player[],
): Record<string, number> {
  const minutes: Record<string, number> = {}
  const all = [...starters, ...bench]

  if (all.length === 0) return minutes

  const sortedStarters = [...starters].sort(sortByOverall)

  for (let i = 0; i < sortedStarters.length; i++) {
    const p = sortedStarters[i]!
    if (i < 2) {
      minutes[p.id] = 36
    } else {
      minutes[p.id] = 32
    }
  }

  const sortedBench = [...bench].sort(sortByOverall)
  for (let i = 0; i < sortedBench.length; i++) {
    const p = sortedBench[i]!
    if (i === 0) {
      minutes[p.id] = 28
    } else if (i <= 1) {
      minutes[p.id] = 20
    } else if (i <= 2) {
      minutes[p.id] = 14
    } else {
      minutes[p.id] = 6
    }
  }

  const sum = Object.values(minutes).reduce((a, b) => a + b, 0)
  const target = TOTAL_MINUTES
  if (sum !== target) {
    const diff = target - sum
    if (diff > 0) {
      const sortedAll = all.sort(sortByOverall)
      let remaining = diff
      for (const p of sortedAll) {
        if (remaining <= 0) break
        const add = Math.min(remaining, 4)
        minutes[p.id] = (minutes[p.id] ?? 0) + add
        remaining -= add
      }
    } else if (diff < 0) {
      const sortedAll = all.sort((a, b) => sortByOverall(b, a))
      let remaining = -diff
      for (const p of sortedAll) {
        if (remaining <= 0) break
        const current = minutes[p.id] ?? 0
        const remove = Math.min(remaining, Math.max(0, current - 6))
        minutes[p.id] = current - remove
        remaining -= remove
      }
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
