export type ShotZone =
  | 'at_rim'
  | 'short_mid'
  | 'long_mid'
  | 'corner_three'
  | 'above_break_three'

export type TurnoverType =
  | 'lost_ball'
  | 'bad_pass'
  | 'offensive_foul'
  | 'shot_clock_violation'
  | 'travel'
  | 'three_second_violation'
  | 'out_of_bounds'

export type FoulKind =
  | 'shooting'
  | 'non_shooting'
  | 'offensive'
  | 'loose_ball'
  | 'flagrant'

export type ShotType =
  | 'catch_and_shoot'
  | 'pull_up'
  | 'drive'
  | 'post_up'
  | 'transition'
  | 'putback'

export interface ShotEvent {
  type: 'shot'
  playerId: string
  teamId: string
  zone: ShotZone
  shotType: ShotType
  made: boolean
  assistedBy?: string
  blockedBy?: string
  period: number
  timeRemainingSeconds: number
  impact: number
}

export interface ReboundEvent {
  type: 'rebound'
  playerId: string
  teamId: string
  offensive: boolean
  period: number
  timeRemainingSeconds: number
  impact: number
}

export interface TurnoverEvent {
  type: 'turnover'
  playerId: string
  teamId: string
  turnoverType: TurnoverType
  stolenBy?: string
  period: number
  timeRemainingSeconds: number
  impact: number
}

export interface FoulEvent {
  type: 'foul'
  playerId: string
  teamId: string
  fouledPlayerId?: string
  kind: FoulKind
  onShot: boolean
  period: number
  timeRemainingSeconds: number
  impact?: number
}

export interface FreeThrowEvent {
  type: 'freeThrow'
  playerId: string
  teamId: string
  attempt: number
  made: boolean
  period: number
  timeRemainingSeconds: number
}

export interface SubstitutionEvent {
  type: 'substitution'
  teamId: string
  out: string
  in: string
  period: number
  timeRemainingSeconds: number
}

export interface EndOfPeriodEvent {
  type: 'endOfPeriod'
  period: number
}

export type SimEvent =
  | ShotEvent
  | ReboundEvent
  | TurnoverEvent
  | FoulEvent
  | FreeThrowEvent
  | SubstitutionEvent
  | EndOfPeriodEvent

export type SimEventType = SimEvent['type']

export interface TeamShotZones {
  made: number
  attempted: number
}

export interface PlayerGameStats {
  playerId: string
  teamId: string
  started: boolean
  minutes: number
  points: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  offensiveRebounds: number
  defensiveRebounds: number
  totalRebounds: number
  assists: number
  turnovers: number
  steals: number
  blocks: number
  fouls: number
  plusMinus: number
  shotsAtRim: TeamShotZones
  shotsShortMid: TeamShotZones
  shotsLongMid: TeamShotZones
  shotsCornerThree: TeamShotZones
  shotsAboveBreakThree: TeamShotZones
}

export interface TeamGameStats {
  teamId: string
  points: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  offensiveRebounds: number
  defensiveRebounds: number
  totalRebounds: number
  assists: number
  turnovers: number
  steals: number
  blocks: number
  fouls: number
  fastBreakPoints: number
  pointsInPaint: number
  secondChancePoints: number
  benchPoints: number
}

export interface GameClock {
  period: 1 | 2 | 3 | 4 | 5 | 6 | 7
  timeRemainingSeconds: number
}

export interface FoulCounts {
  team: number
  byPlayer: Record<string, number>
}

export interface BoxScoreResult {
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  homeWin: boolean
  overtimeOccurred: boolean
  teamStats: { home: TeamGameStats; away: TeamGameStats }
  playerStats: Record<string, PlayerGameStats>
  keyPlays: SimEvent[]
}

export interface PossessionResult {
  points: number
  timeElapsedSeconds: number
  events: SimEvent[]
  possessionChange: boolean
  endOfPeriod: boolean
  shotZone?: ShotZone
  shotMade?: boolean
  fouled?: boolean
  turnoverType?: TurnoverType
  reboundType?: 'offensive' | 'defensive' | 'none'
  shotType?: ShotType
  shooterId?: string
  defenderId?: string
  assisterId?: string
  blockerId?: string
  rebounderId?: string
  stealerId?: string
}

export interface GameState {
  id: string
  homeTeamId: string
  awayTeamId: string
  date: string
  status: 'scheduled' | 'in_progress' | 'final'
  attendance: number
  arena: string

  clock: GameClock

  score: { home: number; away: number }
  possession: 'home' | 'away'
  arrow: 'home' | 'away'

  teamStats: { home: TeamGameStats; away: TeamGameStats }
  playerStats: Record<string, PlayerGameStats>

  fouls: {
    home: FoulCounts
    away: FoulCounts
  }

  lineupOnCourt: { home: string[]; away: string[] }
  startingLineups: { home: string[]; away: string[] }

  minutesPlayed: Record<string, number>
  events: SimEvent[]

  injuriesEnabled: boolean
  overtimeOccurred: boolean
  ot5PercentRollTriggered: boolean
  homeWin: boolean | null
}

export function emptyPlayerGameStats(
  playerId: string,
  teamId: string,
  started: boolean,
): PlayerGameStats {
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

export function emptyTeamGameStats(teamId: string): TeamGameStats {
  return {
    teamId,
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
    fastBreakPoints: 0,
    pointsInPaint: 0,
    secondChancePoints: 0,
    benchPoints: 0,
  }
}
