import type {
  GameState,
  PlayerGameStats,
  SimEvent,
  ShotZone,
  BoxScoreResult,
} from '@/game/models/sim'
import { emptyTeamGameStats } from '@/game/sim/gameState'
import { isThreePointZone } from '@/game/sim/shotZones'

export interface BuildBoxScoreInput {
  gameState: GameState
  keyPlays: SimEvent[]
}

export interface BoxScoreConsistency {
  ok: boolean
  issues: string[]
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

function oppositeTeam(teamId: string, home: string, away: string): string {
  return teamId === home ? away : home
}

export function buildBoxScore(input: BuildBoxScoreInput): BoxScoreResult {
  const { gameState, keyPlays } = input
  const home = gameState.homeTeamId
  const away = gameState.awayTeamId

  const playerStats: Record<string, PlayerGameStats> = {}
  const teamStats = {
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

  for (const id of gameState.startingLineups.home) getStats(id, home)
  for (const id of gameState.startingLineups.away) getStats(id, away)

  for (const ev of gameState.events) {
    const offense = ev.type === 'shot' || ev.type === 'turnover' || ev.type === 'freeThrow' || ev.type === 'rebound' || ev.type === 'foul'
    void offense
    if (ev.type === 'shot') {
      const ps = getStats(ev.playerId, ev.teamId)
      const tStats = ev.teamId === home ? teamStats.home : teamStats.away
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
          const ast = getStats(ev.assistedBy, ev.teamId)
          ast.assists++
          tStats.assists++
        }
      } else if (ev.blockedBy) {
        const blk = getStats(ev.blockedBy, oppositeTeam(ev.teamId, home, away))
        blk.blocks++
      }
    } else if (ev.type === 'rebound') {
      const ps = getStats(ev.playerId, ev.teamId)
      const tStats = ev.teamId === home ? teamStats.home : teamStats.away
      if (ev.offensive) {
        ps.offensiveRebounds++
        tStats.offensiveRebounds++
      } else {
        ps.defensiveRebounds++
        tStats.defensiveRebounds++
      }
    } else if (ev.type === 'turnover') {
      const ps = getStats(ev.playerId, ev.teamId)
      const tStats = ev.teamId === home ? teamStats.home : teamStats.away
      ps.turnovers++
      tStats.turnovers++
      if (ev.stolenBy) {
        const stl = getStats(ev.stolenBy, oppositeTeam(ev.teamId, home, away))
        stl.steals++
        const oppStats = oppositeTeam(ev.teamId, home, away) === home ? teamStats.home : teamStats.away
        oppStats.steals++
      }
    } else if (ev.type === 'foul') {
      const ps = getStats(ev.playerId, ev.teamId)
      const tStats = ev.teamId === home ? teamStats.home : teamStats.away
      ps.fouls++
      tStats.fouls++
    } else if (ev.type === 'freeThrow') {
      const ps = getStats(ev.playerId, ev.teamId)
      const tStats = ev.teamId === home ? teamStats.home : teamStats.away
      ps.fta++
      tStats.fta++
      if (ev.made) {
        ps.ftm++
        ps.points++
        tStats.ftm++
      }
    }
  }

  for (const [pid, minutes] of Object.entries(gameState.minutesPlayed)) {
    const ps = playerStats[pid]
    if (ps) ps.minutes = Math.min(48, minutes)
  }

  for (const ps of Object.values(playerStats)) {
    ps.totalRebounds = ps.offensiveRebounds + ps.defensiveRebounds
  }

  teamStats.home.totalRebounds = teamStats.home.offensiveRebounds + teamStats.home.defensiveRebounds
  teamStats.away.totalRebounds = teamStats.away.offensiveRebounds + teamStats.away.defensiveRebounds

  let homeBench = 0
  let awayBench = 0
  for (const ps of Object.values(playerStats)) {
    if (ps.minutes > 0 && !ps.started) {
      if (ps.teamId === home) homeBench += ps.points
      else if (ps.teamId === away) awayBench += ps.points
    }
  }
  teamStats.home.benchPoints = homeBench
  teamStats.away.benchPoints = awayBench

  teamStats.home.points = gameState.score.home
  teamStats.away.points = gameState.score.away

  return {
    homeTeamId: home,
    awayTeamId: away,
    homeScore: gameState.score.home,
    awayScore: gameState.score.away,
    homeWin: gameState.score.home > gameState.score.away,
    overtimeOccurred: gameState.overtimeOccurred,
    teamStats,
    playerStats,
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
  return { ok: issues.length === 0, issues }
}
