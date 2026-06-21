import type { Player } from '@/game/models/player'
import type { LineupSettings } from '@/game/models/team'
import { isInjured } from '@/game/management/rotationValidator'
import { FOUL_LIMIT, MIN_BENCH_FOR_SUB } from '@/game/sim/simConstants'

export interface PlannedSub {
  teamId: string
  out: string
  in: string
  period: number
  timeRemainingSeconds: number
}

export interface SubstitutionContext {
  team: 'home' | 'away'
  teamId: string
  lineup: LineupSettings
  players: Map<string, Player>
  onCourt: string[]
  minutesPlayed: Record<string, number>
  period: number
  timeRemainingSeconds: number
  foulsByPlayer: Record<string, number>
  closingMarginLeq5: boolean
}

// Injured players are explicitly excluded from playing time:
// - healthyOnCourt filters them out so they're never considered for minutes
// - injuredOnCourt immediately subs them out
// - pickHealthySubstitute excludes injured bench players
// Result: injured players always receive 0 minutes.

export function planSubstitutions(ctx: SubstitutionContext): PlannedSub[] {
  const subs: PlannedSub[] = []
  const healthyOnCourt = ctx.onCourt.filter((id) => {
    const p = ctx.players.get(id)
    return p ? !isInjured(p) : false
  })

  for (const id of healthyOnCourt) {
    const fouls = ctx.foulsByPlayer[id] ?? 0
    if (fouls >= FOUL_LIMIT) {
      const sub = pickHealthySubstitute(ctx, id)
      if (sub) subs.push(sub)
    }
  }

  const injuredOnCourt = ctx.onCourt.filter((id) => {
    const p = ctx.players.get(id)
    return p ? isInjured(p) : false
  })
  for (const id of injuredOnCourt) {
    const sub = pickHealthySubstitute(ctx, id)
    if (sub) subs.push(sub)
  }

  for (const id of ctx.onCourt) {
    const target = ctx.lineup.targetMinutes[id] ?? 0
    if (target <= 0) continue
    const current = ctx.minutesPlayed[id] ?? 0
    if (current >= target) {
      const sub = pickHealthySubstitute(ctx, id)
      if (sub) subs.push(sub)
    }
  }

  if (
    ctx.period >= 4 &&
    ctx.timeRemainingSeconds <= 300 &&
    ctx.closingMarginLeq5 &&
    ctx.lineup.closingLineup.length === 5
  ) {
    const closingSet = new Set(ctx.lineup.closingLineup)
    const liveCourt = new Set<string>(ctx.onCourt)
    for (const s of subs) {
      liveCourt.delete(s.out)
      liveCourt.add(s.in)
    }
    const toPull = Array.from(liveCourt).filter((id) => !closingSet.has(id))
    const desiredCourt = new Set(liveCourt)
    for (const id of toPull) {
      const replacement = ctx.lineup.closingLineup.find(
        (c) => !desiredCourt.has(c),
      )
      if (!replacement) break
      const p = ctx.players.get(replacement)
      if (!p || isInjured(p)) {
        continue
      }
      subs.push({
        teamId: ctx.teamId,
        out: id,
        in: replacement,
        period: ctx.period,
        timeRemainingSeconds: ctx.timeRemainingSeconds,
      })
      desiredCourt.delete(id)
      desiredCourt.add(replacement)
    }
  }

  return dedupSubs(subs)
}

function pickHealthySubstitute(
  ctx: SubstitutionContext,
  outId: string,
): PlannedSub | null {
  const bench = ctx.lineup.bench
  if (bench.length < MIN_BENCH_FOR_SUB) return null

  const onCourtSet = new Set(ctx.onCourt)
  const candidates = bench
    .map((id) => ctx.players.get(id))
    .filter((p): p is Player => Boolean(p))
    .filter((p) => !isInjured(p))
    .filter((p) => !onCourtSet.has(p.id))
    .filter((p) => (ctx.lineup.targetMinutes[p.id] ?? 0) > 0)

  if (candidates.length === 0) return null

  const target = ctx.lineup.targetMinutes[outId] ?? 24
  const replacement = candidates.sort((a, b) => {
    const distA = Math.abs((ctx.minutesPlayed[a.id] ?? 0) - target)
    const distB = Math.abs((ctx.minutesPlayed[b.id] ?? 0) - target)
    return distA - distB
  })[0]

  if (!replacement) return null
  return {
    teamId: ctx.teamId,
    out: outId,
    in: replacement.id,
    period: ctx.period,
    timeRemainingSeconds: ctx.timeRemainingSeconds,
  }
}

function dedupSubs(subs: PlannedSub[]): PlannedSub[] {
  const seen = new Set<string>()
  const result: PlannedSub[] = []
  for (const s of subs) {
    const key = `${s.teamId}:${s.out}->${s.in}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(s)
  }
  return result
}
