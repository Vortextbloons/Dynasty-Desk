// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  generateDraftClass,
  runLottery,
  runInverseWLDraftOrder,
  isModernLotteryEra,
} from '@/game/league/draftEngine'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { SeededRandom } from '@/game/sim/rng'
import type { LeagueState } from '@/game/models/league'
import { makeTeam } from '@/tests/fixtures'

function makeMiniLeague(): LeagueState {
  const teams: LeagueState['teams'] = {}
  const standings: LeagueState['standings'] = {}
  for (let i = 0; i < 4; i++) {
    const t = makeTeam({ id: `t${i}`, conference: i < 2 ? 'East' : 'West' })
    teams[t.id] = t
    standings[t.id] = {
      teamId: t.id,
      season: '2025-26',
      gamesPlayed: 82,
      wins: i,
      losses: 82 - i,
      winPct: i / 82,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      conferenceRank: 0,
      divisionRank: 0,
      streak: 0,
      last10: '',
      clinchedPlayoff: i >= 2,
      clinchedDivision: false,
      eliminated: i < 2,
      conferenceWins: 0,
      conferenceLosses: 0,
      divisionWins: 0,
      divisionLosses: 0,
      pointsPerGame: 0,
      pointsAllowedPerGame: 0,
      pointDifferentialPerGame: 0,
      gamesRemaining: 0,
      magicNumber: 0,
      tiebreaker: { headToHeadWins: 0, conferenceWinPct: 0, pointDifferential: 0 },
    }
  }
  return {
    id: 'l',
    name: 'L',
    currentDate: '2026-06-01',
    seasonYear: 2026,
    phase: 'offseason',
    rules: DEFAULT_LEAGUE_RULES,
    eraConfig: { season: '2025-26', pace: 100, league3PARate: 0.35, leagueTsPct: 0.57, leaguePpg: 112, possessionCoefficient: 1 },
    snapshotId: 's',
    teams,
    players: {},
    games: {},
    standings,
    scheduleGenerated: false,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    drafts: {},
    scoutingState: {},
    freeAgentOffers: [],
    qualifyingOffers: [],
    compensationPicks: [],
    offseasonLog: [],
    rosterSizeCap: 20,
    champions: [],
    awards: [],
    activeProposals: [],
    rivalries: {},
    records: [],
    hallOfFame: [],
    userTeamId: 't0',
  }
}

describe('draftEngine', () => {
  const rng = new SeededRandom({ seed: '42', position: 0 })

  it('generateDraftClass produces 60 prospects', () => {
    const dc = generateDraftClass(2026, DEFAULT_LEAGUE_RULES, [], rng)
    expect(dc.prospects).toHaveLength(60)
    expect(dc.generatedBy).toBe('hybrid')
  })

  it('modern era uses lottery', () => {
    expect(isModernLotteryEra('2019-20')).toBe(true)
    expect(isModernLotteryEra('2018-19')).toBe(false)
  })

  it('runLottery returns ordered picks', () => {
    const league = makeMiniLeague()
    const results = runLottery(league, rng)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.pickNumber).toBe(1)
  })

  it('runInverseWLDraftOrder returns strict inverse W-L', () => {
    const league = makeMiniLeague()
    const results = runInverseWLDraftOrder(league)
    expect(results[0]?.teamId).toBe('t0')
  })
})
