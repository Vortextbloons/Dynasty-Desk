import type {
  GameState,
  PlayerGameStats,
  SimEvent,
  ShotZone,
  TeamGameStats,
  BoxScoreResult,
} from '@/game/models/sim'
import { emptyTeamGameStats } from '@/game/models/sim'
import { isThreePointZone } from '@/game/sim/shotZones'

export interface BuildBoxScoreInput {
  gameState: GameState
  keyPlays: SimEvent[]
}

export interface BoxScoreConsistency {
  ok: boolean
  issues: string[]
}

type TeamStatsPair = { home: TeamGameStats; away: TeamGameStats }

interface BoxScoreContext {
  home: string
  away: string
  playerStats: Record<string, PlayerGameStats>
  teamStats: TeamStatsPair
  startersHome: Set<string>
  startersAway: Set<string>
  getStats: (id: string, teamId: string) => PlayerGameStats
  teamStatsFor: (teamId: string) => TeamGameStats
  oppositeTeam: (teamId: string) => string
}

function zoneBucket(zone: ShotZone): keyof Pick<
  PlayerGameStats,
  'shotsAtRim' | 'shotsShortMid' | 'shotsLongMid' | 'shotsCornerThree' | 'shotsAboveBreakThree'
> {
  switch (zone) {
    case 'at_rim':
      return 'shotsAtRim'
    case 'short_mid':
      return 'shotsShortMid'
    case 'long_mid':
      return 'shotsLongMid'
    case 'corner_three':
      return 'shotsCornerThree'
    case 'above_break_three':
      return 'shotsAboveBreakThree'
  }
}

function emptyPlayerStats(playerId: string, teamId: string, started: boolean): PlayerGameStats {
  return {
    playerId,
    teamId,
    started,
    minutes: 0,
    points: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    totalRebounds: 0,
    assists: 0,
    turnovers: 0,
    steals: 0,
    blocks: 0,
    fouls: 0,
    plusMinus: 0,
    shotsAtRim: { made: 0, attempted: 0 },
    shotsShortMid: { made: 0, attempted: 0 },
    shotsLongMid: { made: 0, attempted: 0 },
    shotsCornerThree: { made: 0, attempted: 0 },
    shotsAboveBreakThree: { made: 0, attempted: 0 },
  }
}

function createBoxScoreContext(gameState: GameState): BoxScoreContext {
  const home = gameState.homeTeamId
  const away = gameState.awayTeamId
  const playerStats: Record<string, PlayerGameStats> = {}
  const teamStats: TeamStatsPair = {
    home: emptyTeamGameStats(home),
    away: emptyTeamGameStats(away),
  }
  const startersHome = new Set(gameState.startingLineups.home)
  const startersAway = new Set(gameState.startingLineups.away)

  const getStats = (id: string, teamId: string): PlayerGameStats => {
    let s = playerStats[id]
    if (!s) {
      const started = startersHome.has(id) || startersAway.has(id)
      s = emptyPlayerStats(id, teamId, started)
      playerStats[id] = s
    }
    return s
  }

  return {
    home,
    away,
    playerStats,
    teamStats,
    startersHome,
    startersAway,
    getStats,
    teamStatsFor: (teamId) => (teamId === home ? teamStats.home : teamStats.away),
    oppositeTeam: (teamId) => (teamId === home ? away : home),
  }
}

function applyShotEvent(ctx: BoxScoreContext, ev: Extract<SimEvent, { type: 'shot' }>): void {
  const ps = ctx.getStats(ev.playerId, ev.teamId)
  const tStats = ctx.teamStatsFor(ev.teamId)
  ps.fga++
  tStats.fga++
  const bucket = zoneBucket(ev.zone)
  ps[bucket].attempted++
  if (isThreePointZone(ev.zone)) {
    ps.tpa++
    tStats.tpa++
  }
  if (ev.made) {
    ps.fgm++
    tStats.fgm++
    const pts = isThreePointZone(ev.zone) ? 3 : 2
    ps.points += pts
    if (isThreePointZone(ev.zone)) {
      ps.tpm++
      tStats.tpm++
    }
    if (ev.zone === 'at_rim') tStats.pointsInPaint += 2
    if (ev.shotType === 'transition') tStats.fastBreakPoints += pts
    if (ev.assistedBy) {
      const ast = ctx.getStats(ev.assistedBy, ev.teamId)
      ast.assists++
      tStats.assists++
    }
  } else if (ev.blockedBy) {
    const blk = ctx.getStats(ev.blockedBy, ctx.oppositeTeam(ev.teamId))
    blk.blocks++
  }
}

function applyReboundEvent(ctx: BoxScoreContext, ev: Extract<SimEvent, { type: 'rebound' }>): void {
  const ps = ctx.getStats(ev.playerId, ev.teamId)
  const tStats = ctx.teamStatsFor(ev.teamId)
  if (ev.offensive) {
    ps.offensiveRebounds++
    tStats.offensiveRebounds++
  } else {
    ps.defensiveRebounds++
    tStats.defensiveRebounds++
  }
}

function applyTurnoverEvent(ctx: BoxScoreContext, ev: Extract<SimEvent, { type: 'turnover' }>): void {
  const ps = ctx.getStats(ev.playerId, ev.teamId)
  const tStats = ctx.teamStatsFor(ev.teamId)
  ps.turnovers++
  tStats.turnovers++
  if (ev.stolenBy) {
    const stl = ctx.getStats(ev.stolenBy, ctx.oppositeTeam(ev.teamId))
    stl.steals++
    ctx.teamStatsFor(ctx.oppositeTeam(ev.teamId)).steals++
  }
}

function applyFoulEvent(ctx: BoxScoreContext, ev: Extract<SimEvent, { type: 'foul' }>): void {
  const ps = ctx.getStats(ev.playerId, ev.teamId)
  const tStats = ctx.teamStatsFor(ev.teamId)
  ps.fouls++
  tStats.fouls++
}

function applyFreeThrowEvent(ctx: BoxScoreContext, ev: Extract<SimEvent, { type: 'freeThrow' }>): void {
  const ps = ctx.getStats(ev.playerId, ev.teamId)
  const tStats = ctx.teamStatsFor(ev.teamId)
  ps.fta++
  tStats.fta++
  if (ev.made) {
    ps.ftm++
    ps.points++
    tStats.ftm++
  }
}

function applyEvent(ctx: BoxScoreContext, ev: SimEvent): void {
  switch (ev.type) {
    case 'shot':
      applyShotEvent(ctx, ev)
      break
    case 'rebound':
      applyReboundEvent(ctx, ev)
      break
    case 'turnover':
      applyTurnoverEvent(ctx, ev)
      break
    case 'foul':
      applyFoulEvent(ctx, ev)
      break
    case 'freeThrow':
      applyFreeThrowEvent(ctx, ev)
      break
  }
}

export function buildBoxScore(input: BuildBoxScoreInput): BoxScoreResult {
  const { gameState, keyPlays } = input
  const ctx = createBoxScoreContext(gameState)

  for (const id of gameState.startingLineups.home) ctx.getStats(id, ctx.home)
  for (const id of gameState.startingLineups.away) ctx.getStats(id, ctx.away)

  for (const ev of gameState.events) {
    applyEvent(ctx, ev)
  }

  for (const [pid, minutes] of Object.entries(gameState.minutesPlayed)) {
    const ps = ctx.playerStats[pid]
    if (ps) ps.minutes = Math.min(48, minutes)
  }

  for (const ps of Object.values(ctx.playerStats)) {
    ps.totalRebounds = ps.offensiveRebounds + ps.defensiveRebounds
  }

  ctx.teamStats.home.totalRebounds =
    ctx.teamStats.home.offensiveRebounds + ctx.teamStats.home.defensiveRebounds
  ctx.teamStats.away.totalRebounds =
    ctx.teamStats.away.offensiveRebounds + ctx.teamStats.away.defensiveRebounds

  let homeBench = 0
  let awayBench = 0
  for (const ps of Object.values(ctx.playerStats)) {
    if (ps.minutes > 0 && !ps.started) {
      if (ps.teamId === ctx.home) homeBench += ps.points
      else if (ps.teamId === ctx.away) awayBench += ps.points
    }
  }
  ctx.teamStats.home.benchPoints = homeBench
  ctx.teamStats.away.benchPoints = awayBench

  ctx.teamStats.home.points = gameState.score.home
  ctx.teamStats.away.points = gameState.score.away

  return {
    homeTeamId: ctx.home,
    awayTeamId: ctx.away,
    homeScore: gameState.score.home,
    awayScore: gameState.score.away,
    homeWin: gameState.score.home > gameState.score.away,
    overtimeOccurred: gameState.overtimeOccurred,
    teamStats: ctx.teamStats,
    playerStats: ctx.playerStats,
    keyPlays,
  }
}

export function checkConsistency(box: BoxScoreResult): BoxScoreConsistency {
  const issues: string[] = []
  const sum = (teamId: string, pick: (ps: PlayerGameStats) => number): number => {
    let total = 0
    for (const ps of Object.values(box.playerStats)) {
      if (ps.teamId === teamId) total += pick(ps)
    }
    return total
  }
  const home = box.teamStats.home
  const away = box.teamStats.away
  const check = (label: string, computed: number, expected: number) => {
    if (computed !== expected) {
      issues.push(`${label} mismatch: sum(player) = ${computed}, team = ${expected}`)
    }
  }
  check('Home points', sum(box.homeTeamId, (p) => p.points), home.points)
  check('Away points', sum(box.awayTeamId, (p) => p.points), away.points)
  check('Home rebounds', sum(box.homeTeamId, (p) => p.totalRebounds), home.totalRebounds)
  check('Away rebounds', sum(box.awayTeamId, (p) => p.totalRebounds), away.totalRebounds)
  check('Home FGA', sum(box.homeTeamId, (p) => p.fga), home.fga)
  check('Away FGA', sum(box.awayTeamId, (p) => p.fga), away.fga)
  check('Home FGM', sum(box.homeTeamId, (p) => p.fgm), home.fgm)
  check('Away FGM', sum(box.awayTeamId, (p) => p.fgm), away.fgm)
  check('Home TPV', sum(box.homeTeamId, (p) => p.turnovers), home.turnovers)
  check('Away TPV', sum(box.awayTeamId, (p) => p.turnovers), away.turnovers)
  check('Home FT', sum(box.homeTeamId, (p) => p.ftm), home.ftm)
  check('Away FT', sum(box.awayTeamId, (p) => p.ftm), away.ftm)
  check('Home FTA', sum(box.homeTeamId, (p) => p.fta), home.fta)
  check('Away FTA', sum(box.awayTeamId, (p) => p.fta), away.fta)
  check('Home 3P', sum(box.homeTeamId, (p) => p.tpm), home.tpm)
  check('Away 3P', sum(box.awayTeamId, (p) => p.tpm), away.tpm)
  check('Home 3PA', sum(box.homeTeamId, (p) => p.tpa), home.tpa)
  check('Away 3PA', sum(box.awayTeamId, (p) => p.tpa), away.tpa)
  check('Home AST', sum(box.homeTeamId, (p) => p.assists), home.assists)
  check('Away AST', sum(box.awayTeamId, (p) => p.assists), away.assists)
  check('Home STL', sum(box.homeTeamId, (p) => p.steals), home.steals)
  check('Away STL', sum(box.awayTeamId, (p) => p.steals), away.steals)
  check('Home BLK', sum(box.homeTeamId, (p) => p.blocks), home.blocks)
  check('Away BLK', sum(box.awayTeamId, (p) => p.blocks), away.blocks)
  check('Home PF', sum(box.homeTeamId, (p) => p.fouls), home.fouls)
  check('Away PF', sum(box.awayTeamId, (p) => p.fouls), away.fouls)
  return { ok: issues.length === 0, issues }
}
