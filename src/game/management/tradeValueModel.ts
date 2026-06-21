import type { DraftPick } from '@/game/models/draft'
import type { Player } from '@/game/models/player'
import type { Position } from '@/game/models/position'
import type { Team, TeamDirection } from '@/game/models/team'
import type { TradeSide } from '@/game/models/trade'

export interface TradeValueContext {
  teamDirection: TeamDirection
  positionNeed: Record<Position, number>
}

export interface PerSideValue {
  outgoing: number
  incoming: number
  delta: number
}

const POSITION_BONUS: Record<Position, number> = {
  PG: 1.0,
  SG: 0.9,
  SF: 0.95,
  PF: 0.85,
  C: 0.9,
}

export function computePlayerValue(
  player: Player,
  team: Team,
  context: TradeValueContext,
): number {
  const ratings = player.ratings
  const yearZeroSalary = player.contract.salaryByYear[0] ?? 0
  const injuryRisk = player.health.status === 'healthy' ? 0 : 1
  const ntcPenalty = player.contract.noTradeClause ? 4 : 0
  const positionBonus = POSITION_BONUS[player.position] ?? 1
  const need = context.positionNeed[player.position] ?? 0
  void team

  let contenderBonus = 0
  let rebuilderPenalty = 0
  let rebuilderYoungBonus = 0
  if (context.teamDirection === 'contender' && player.age > 28) {
    contenderBonus = 8
  }
  if (
    (context.teamDirection === 'rebuilding' || context.teamDirection === 'tanking') &&
    player.age > 28
  ) {
    rebuilderPenalty = 10
  }
  if (
    (context.teamDirection === 'rebuilding' || context.teamDirection === 'tanking') &&
    player.age < 26
  ) {
    rebuilderYoungBonus = 6
  }

  return (
    ratings.overall * 0.5 +
    ratings.potential * 0.15 +
    (40 - player.age) * 0.5 +
    need * 5 +
    positionBonus * need * 10 -
    (yearZeroSalary / 1_000_000) * 0.4 -
    injuryRisk * 5 +
    contenderBonus +
    rebuilderYoungBonus -
    rebuilderPenalty -
    ntcPenalty
  )
}

export function computePickValue(pick: DraftPick, projectedWins: number): number {
  if (pick.round === 2) return 15

  const expectedWins = Math.max(0, Math.min(82, projectedWins))
  const winPct = expectedWins / 82
  const reverseWinPct = 1 - winPct

  if (reverseWinPct >= 0.8) return 80
  if (reverseWinPct >= 0.5) return 60
  if (winPct < 0.55) return 50
  return 35
}

export interface TradeValueDelta {
  perSideValue: Record<string, PerSideValue>
}

export function computeTradeValueDelta(
  sides: TradeSide[],
  teamLookup: (teamId: string) => Team | undefined,
  playerLookup: (playerId: string) => Player | undefined,
  pickLookup: (pickId: string) => DraftPick | undefined,
  projectedWins: Record<string, number>,
  defaultContext: TradeValueContext,
): TradeValueDelta {
  const perSideValue: Record<string, PerSideValue> = {}

  for (const side of sides) {
    const team = teamLookup(side.teamId)
    const ctx: TradeValueContext = team
      ? { teamDirection: team.direction, positionNeed: defaultContext.positionNeed }
      : defaultContext

    let outgoing = 0
    for (const asset of side.outgoing) {
      outgoing += valueOfAsset(asset, side.teamId, teamLookup, playerLookup, pickLookup, projectedWins, ctx)
    }

    let incoming = 0
    for (const asset of side.incoming) {
      incoming += valueOfAsset(asset, side.teamId, teamLookup, playerLookup, pickLookup, projectedWins, ctx)
    }

    perSideValue[side.teamId] = {
      outgoing: round1(outgoing),
      incoming: round1(incoming),
      delta: round1(incoming - outgoing),
    }
  }

  return { perSideValue }
}

function valueOfAsset(
  asset: TradeSide['outgoing'][number],
  sideTeamId: string,
  teamLookup: (teamId: string) => Team | undefined,
  playerLookup: (playerId: string) => Player | undefined,
  pickLookup: (pickId: string) => DraftPick | undefined,
  projectedWins: Record<string, number>,
  ctx: TradeValueContext,
): number {
  if (asset.type === 'player' && asset.playerId) {
    const player = playerLookup(asset.playerId)
    if (!player) return 0
    const team = teamLookup(sideTeamId)
    if (!team) return 0
    return computePlayerValue(player, team, ctx)
  }
  if (asset.type === 'pick' && asset.pickId) {
    const pick = pickLookup(asset.pickId)
    if (!pick) return 0
    const projected = projectedWins[pick.originalTeamId] ?? 41
    return computePickValue(pick, projected)
  }
  if (asset.type === 'cash' && asset.cashAmount) {
    return asset.cashAmount / 1_000_000
  }
  if (asset.type === 'exception' && asset.exceptionId) {
    return 0
  }
  return 0
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
