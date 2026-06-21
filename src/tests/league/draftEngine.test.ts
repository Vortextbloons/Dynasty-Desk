// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  generateDraftClass,
  runLottery,
  runInverseWLDraftOrder,
  isModernLotteryEra,
  startDraft,
  simulateDraftPick,
  autoPickForTeam,
  assignPickNumbers,
  canTeamDraft,
  getAvailableProspects,
  getCurrentPickOwner,
  formatSeasonLabel,
  parseSeasonStartYear,
  countDraftSlots,
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

describe('formatSeasonLabel', () => {
  it('formats year range correctly', () => {
    expect(formatSeasonLabel(2025)).toBe('2025-26')
    expect(formatSeasonLabel(2019)).toBe('2019-20')
    expect(formatSeasonLabel(2009)).toBe('2009-10')
  })
})

describe('parseSeasonStartYear', () => {
  it('extracts start year from season string', () => {
    expect(parseSeasonStartYear('2025-26')).toBe(2025)
    expect(parseSeasonStartYear('2019-20')).toBe(2019)
  })

  it('falls back to current year for invalid string', () => {
    const result = parseSeasonStartYear('invalid')
    expect(result).toBe(new Date().getFullYear())
  })
})

describe('canTeamDraft', () => {
  it('returns ok for team under roster cap', () => {
    const league = makeMiniLeague()
    expect(canTeamDraft(league, 't0').ok).toBe(true)
  })

  it('rejects when roster is at cap', () => {
    const league = makeMiniLeague()
    league.teams.t0!.roster = Array.from({ length: 20 }, (_, i) => `p${i}`)
    const result = canTeamDraft(league, 't0')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Roster at soft cap')
  })

  it('rejects for nonexistent team', () => {
    const league = makeMiniLeague()
    expect(canTeamDraft(league, 'nonexistent').ok).toBe(false)
  })
})

describe('startDraft', () => {
  const rng = new SeededRandom({ seed: '42', position: 0 })
  it('creates a draft object in the league', () => {
    const league = makeMiniLeague()
    const dc = generateDraftClass(2026, DEFAULT_LEAGUE_RULES, [], rng)
    const order = runInverseWLDraftOrder(league)
    const draft = startDraft(league, dc, order, 'inverse_wl')
    expect(draft.status).toBe('in_progress')
    expect(draft.currentPickNumber).toBe(1)
    expect(league.drafts[draft.id]).toBeDefined()
  })
})

describe('simulateDraftPick', () => {
  const rng = new SeededRandom({ seed: '42', position: 0 })
  it('allows a valid pick and advances pick number', () => {
    const league = makeMiniLeague()
    const dc = generateDraftClass(2026, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const order = runInverseWLDraftOrder(league)
    league.draftPicks = order.map((o) => ({
      id: `pick-${o.pickNumber}`,
      season: '2026-27',
      round: o.pickNumber <= 4 ? 1 : 2,
      pickNumber: o.pickNumber,
      originalTeamId: o.teamId,
      currentTeamId: o.teamId,
      prospectId: null,
    }))
    const draft = startDraft(league, dc, order, 'inverse_wl')
    const prospect = dc.prospects[0]!
    const result = simulateDraftPick(league, draft, order[0]!.teamId, prospect.id, false, rng)
    expect('error' in result).toBe(false)
    expect(draft.currentPickNumber).toBe(2)
  })

  it('rejects pick when not your turn', () => {
    const league = makeMiniLeague()
    const dc = generateDraftClass(2026, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const order = runInverseWLDraftOrder(league)
    league.draftPicks = order.map((o) => ({
      id: `pick-${o.pickNumber}`,
      season: '2026-27',
      round: 1,
      pickNumber: o.pickNumber,
      originalTeamId: o.teamId,
      currentTeamId: o.teamId,
      prospectId: null,
    }))
    const draft = startDraft(league, dc, order, 'inverse_wl')
    const prospect = dc.prospects[0]!
    const wrongTeam = order[1]!.teamId
    const result = simulateDraftPick(league, draft, wrongTeam, prospect.id, false, rng)
    expect('error' in result).toBe(true)
  })

  it('rejects unavailable prospect', () => {
    const league = makeMiniLeague()
    const dc = generateDraftClass(2026, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const order = runInverseWLDraftOrder(league)
    league.draftPicks = order.map((o) => ({
      id: `pick-${o.pickNumber}`,
      season: '2026-27',
      round: 1,
      pickNumber: o.pickNumber,
      originalTeamId: o.teamId,
      currentTeamId: o.teamId,
      prospectId: null,
    }))
    const draft = startDraft(league, dc, order, 'inverse_wl')
    const result = simulateDraftPick(league, draft, order[0]!.teamId, 'fake-prospect', false, rng)
    expect('error' in result).toBe(true)
  })
})

describe('autoPickForTeam', () => {
  const rng = new SeededRandom({ seed: '42', position: 0 })
  it('picks the best available prospect', () => {
    const league = makeMiniLeague()
    const dc = generateDraftClass(2026, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const order = runInverseWLDraftOrder(league)
    league.draftPicks = order.map((o) => ({
      id: `pick-${o.pickNumber}`,
      season: '2026-27',
      round: 1,
      pickNumber: o.pickNumber,
      originalTeamId: o.teamId,
      currentTeamId: o.teamId,
      prospectId: null,
    }))
    const draft = startDraft(league, dc, order, 'inverse_wl')
    const result = autoPickForTeam(league, draft, order[0]!.teamId, rng)
    expect(result).not.toBeNull()
    if (result && !('error' in result)) {
      expect(result.pickedByTeamId).toBe(order[0]!.teamId)
      expect(draft.currentPickNumber).toBe(2)
    }
  })
})

describe('getAvailableProspects', () => {
  const rng = new SeededRandom({ seed: '42', position: 0 })
  it('excludes already-drafted prospects', () => {
    const league = makeMiniLeague()
    const dc = generateDraftClass(2026, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const order = runInverseWLDraftOrder(league)
    league.draftPicks = order.map((o) => ({
      id: `pick-${o.pickNumber}`,
      season: '2026-27',
      round: 1,
      pickNumber: o.pickNumber,
      originalTeamId: o.teamId,
      currentTeamId: o.teamId,
      prospectId: null,
    }))
    const draft = startDraft(league, dc, order, 'inverse_wl')
    const allBefore = getAvailableProspects(league, draft)
    expect(allBefore).toHaveLength(60)
    simulateDraftPick(league, draft, order[0]!.teamId, dc.prospects[0]!.id, false, rng)
    const after = getAvailableProspects(league, draft)
    expect(after).toHaveLength(59)
  })
})

describe('assignPickNumbers', () => {
  it('assigns first round picks by draft order', () => {
    const league = makeMiniLeague()
    const order = runInverseWLDraftOrder(league)
    league.draftPicks = [{
      id: 'pick-1',
      season: '2026-27',
      round: 1,
      pickNumber: 0,
      originalTeamId: order[0]!.teamId,
      currentTeamId: order[0]!.teamId,
      prospectId: null,
    }]
    assignPickNumbers(league, order, '2026-27')
    const pick = league.draftPicks[0]!
    expect(pick.pickNumber).toBe(1)
  })
})
