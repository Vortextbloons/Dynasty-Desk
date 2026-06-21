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
  repairDraftPickOrder,
  syncDraftClock,
  totalDraftSlotsForSeason,
  getActiveDraft,
  getUserDraftPickSlots,
  getDraftOrderBoard,
  countPicksMade,
  forfeitDraftPick,
  picksUntilUserTurn,
  isUserOnClock,
  getNextDraftPickNumber,
  reconcileDraftPickState,
  FORFEITED_PROSPECT_ID,
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
      tiebreaker: {
        headToHeadWins: 0,
        conferenceWinPct: 0,
        pointDifferential: 0,
      },
    }
  }
  return {
    id: 'l',
    name: 'L',
    currentDate: '2026-06-01',
    seasonYear: 2026,
    phase: 'offseason',
    rules: DEFAULT_LEAGUE_RULES,
    eraConfig: {
      season: '2025-26',
      pace: 100,
      league3PARate: 0.35,
      leagueTsPct: 0.57,
      leaguePpg: 112,
      possessionCoefficient: 1,
    },
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

  it('varies class strength across seasons', () => {
    const topOveralls = Array.from({ length: 80 }, (_, i) => {
      const dc = generateDraftClass(
        2026 + i,
        DEFAULT_LEAGUE_RULES,
        [],
        new SeededRandom({ seed: `draft-variety-${i}`, position: 0 }),
      )
      return Math.max(...dc.prospects.map((p) => p.trueRatings.overall))
    })

    expect(Math.min(...topOveralls)).toBeLessThanOrEqual(78)
    expect(Math.max(...topOveralls)).toBeGreaterThanOrEqual(84)
    expect(new Set(topOveralls).size).toBeGreaterThan(5)
  })

  it('keeps most synthetic rookies out of instant-star range', () => {
    const dc = generateDraftClass(
      2026,
      DEFAULT_LEAGUE_RULES,
      [],
      new SeededRandom({ seed: 'draft-distribution', position: 0 }),
    )
    const instantStars = dc.prospects.filter((p) => p.trueRatings.overall >= 85)
    const firstRoundReady = dc.prospects.filter(
      (p) => p.trueRatings.overall >= 70,
    )

    expect(instantStars.length).toBeLessThanOrEqual(1)
    expect(firstRoundReady.length).toBeGreaterThanOrEqual(5)
    expect(firstRoundReady.length).toBeLessThanOrEqual(25)
  })

  it('modern era uses lottery', () => {
    expect(isModernLotteryEra('2019-20')).toBe(true)
    expect(isModernLotteryEra('2018-19')).toBe(false)
  })

  it('runLottery returns ordered picks', () => {
    const league = makeMiniLeague()
    const results = runLottery(league, rng)
    expect(results.length).toBe(4)
    expect(results[0]?.pickNumber).toBe(1)
    expect(results[0]?.teamId).toBeTruthy()
    expect(league.teams[results[0]!.teamId]).toBeDefined()
  })

  it('runLottery still produces order when every team is in the playoff bracket', () => {
    const league = makeMiniLeague()
    league.playoffBracket = {
      seasonYear: 2026,
      format: 'top8',
      east: [
        {
          id: 's1',
          conference: 'East',
          round: 1,
          higherSeedTeamId: 't0',
          lowerSeedTeamId: 't1',
          higherSeed: 1,
          lowerSeed: 2,
          seriesLength: 7,
          higherSeedWins: 4,
          lowerSeedWins: 2,
          status: 'final',
          games: [],
          winnerTeamId: 't0',
          isUpset: false,
          startDate: '2026-06-01',
        },
      ],
      west: [
        {
          id: 's2',
          conference: 'West',
          round: 1,
          higherSeedTeamId: 't2',
          lowerSeedTeamId: 't3',
          higherSeed: 1,
          lowerSeed: 2,
          seriesLength: 7,
          higherSeedWins: 4,
          lowerSeedWins: 1,
          status: 'final',
          games: [],
          winnerTeamId: 't2',
          isUpset: false,
          startDate: '2026-06-01',
        },
      ],
      status: 'complete',
      championTeamId: 't0',
      runnerUpTeamId: 't2',
    }
    for (const id of Object.keys(league.teams)) {
      const standing = league.standings[id]
      if (standing) standing.clinchedPlayoff = true
    }

    const results = runLottery(league, rng)
    expect(results.length).toBe(4)
    expect(league.teams[results[0]!.teamId]).toBeDefined()
  })

  it('runInverseWLDraftOrder returns strict inverse W-L', () => {
    const league = makeMiniLeague()
    const results = runInverseWLDraftOrder(league)
    expect(results[0]?.teamId).toBe('t0')
  })
  it('assignPickNumbers numbers all first-round picks for a full league order', () => {
    const league = makeMiniLeague()
    const seasonLabel = '2027-28'
    league.draftPicks = Object.keys(league.teams).flatMap((teamId) => [
      {
        id: `r1-${teamId}`,
        season: seasonLabel,
        round: 1,
        pickNumber: 0,
        originalTeamId: teamId,
        currentTeamId: teamId,
        prospectId: null,
      },
      {
        id: `r2-${teamId}`,
        season: seasonLabel,
        round: 2,
        pickNumber: 0,
        originalTeamId: teamId,
        currentTeamId: teamId,
        prospectId: null,
      },
    ])

    const order = runLottery(league, rng)
    assignPickNumbers(league, order, seasonLabel)

    const numbered = league.draftPicks.filter(
      (p) => p.season === seasonLabel && p.pickNumber > 0,
    )
    expect(numbered.length).toBe(8)
    expect(countDraftSlots(league, 2027)).toBe(8)
    expect(totalDraftSlotsForSeason(league, 2027)).toBe(8)
  })

  it('repairs partially numbered drafts and resumes the clock', () => {
    const league = makeMiniLeague()
    const seasonLabel = '2027-28'
    league.draftPicks = Object.keys(league.teams).flatMap((teamId) => [
      {
        id: `r1-${teamId}`,
        season: seasonLabel,
        round: 1,
        pickNumber: 0,
        originalTeamId: teamId,
        currentTeamId: teamId,
        prospectId: null,
      },
      {
        id: `r2-${teamId}`,
        season: seasonLabel,
        round: 2,
        pickNumber: 0,
        originalTeamId: teamId,
        currentTeamId: teamId,
        prospectId: null,
      },
    ])

    const order = runLottery(league, rng)
    assignPickNumbers(league, [order[0]!], seasonLabel)
    expect(countDraftSlots(league, 2027)).toBe(2)

    const draftClass = generateDraftClass(2027, DEFAULT_LEAGUE_RULES, [], rng)
    const draft = startDraft(league, draftClass, order, 'lottery')
    draft.currentPickNumber = 17

    const repaired = repairDraftPickOrder(league, draft, rng)
    expect(repaired).toBe(true)
    expect(countDraftSlots(league, 2027)).toBe(8)
    expect(draft.currentPickNumber).toBeGreaterThan(0)
    expect(draft.currentPickNumber).toBeLessThanOrEqual(8)
    expect(draft.status).toBe('in_progress')
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

describe('getActiveDraft', () => {
  it('returns the upcoming draft while older completed drafts remain', () => {
    const league = makeMiniLeague()
    league.phase = 'draft'
    league.seasonYear = 2026
    league.drafts['draft-2026'] = {
      id: 'draft-2026',
      seasonYear: 2026,
      draftClassId: 'class-old',
      status: 'complete',
      picks: [],
      currentPickNumber: 5,
      startedAt: '2026-07-01',
      completedAt: '2026-07-02',
      orderSource: 'lottery',
    }
    league.drafts['draft-2027'] = {
      id: 'draft-2027',
      seasonYear: 2027,
      draftClassId: 'class-new',
      status: 'in_progress',
      picks: [],
      currentPickNumber: 1,
      startedAt: '2027-07-01',
      orderSource: 'lottery',
    }

    expect(getActiveDraft(league)?.id).toBe('draft-2027')
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
    const result = simulateDraftPick(
      league,
      draft,
      order[0]!.teamId,
      prospect.id,
      false,
      rng,
    )
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
    const result = simulateDraftPick(
      league,
      draft,
      wrongTeam,
      prospect.id,
      false,
      rng,
    )
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
    const result = simulateDraftPick(
      league,
      draft,
      order[0]!.teamId,
      'fake-prospect',
      false,
      rng,
    )
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
    simulateDraftPick(
      league,
      draft,
      order[0]!.teamId,
      dc.prospects[0]!.id,
      false,
      rng,
    )
    const after = getAvailableProspects(league, draft)
    expect(after).toHaveLength(59)
  })
})

describe('assignPickNumbers', () => {
  it('assigns first round picks by draft order', () => {
    const league = makeMiniLeague()
    const order = runInverseWLDraftOrder(league)
    league.draftPicks = [
      {
        id: 'pick-1',
        season: '2026-27',
        round: 1,
        pickNumber: 0,
        originalTeamId: order[0]!.teamId,
        currentTeamId: order[0]!.teamId,
        prospectId: null,
      },
    ]
    assignPickNumbers(league, order, '2026-27')
    const pick = league.draftPicks[0]!
    expect(pick.pickNumber).toBe(1)
  })
})

function makeSizedLeague(teamCount: number, userTeamId = 'user'): LeagueState {
  const teams: LeagueState['teams'] = {}
  const standings: LeagueState['standings'] = {}
  for (let i = 0; i < teamCount; i++) {
    const id = i === 0 ? userTeamId : `t${i}`
    const t = makeTeam({ id, abbreviation: id.toUpperCase().slice(0, 3) })
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
      clinchedPlayoff: i >= teamCount - 16,
      clinchedDivision: false,
      eliminated: i < teamCount - 16,
      conferenceWins: 0,
      conferenceLosses: 0,
      divisionWins: 0,
      divisionLosses: 0,
      pointsPerGame: 0,
      pointsAllowedPerGame: 0,
      pointDifferentialPerGame: 0,
      gamesRemaining: 0,
      magicNumber: 0,
      tiebreaker: {
        headToHeadWins: 0,
        conferenceWinPct: 0,
        pointDifferential: 0,
      },
    }
  }
  return {
    id: 'l',
    name: 'L',
    currentDate: '2026-06-01',
    seasonYear: 2026,
    phase: 'draft',
    rules: DEFAULT_LEAGUE_RULES,
    eraConfig: {
      season: '2025-26',
      pace: 100,
      league3PARate: 0.35,
      leagueTsPct: 0.57,
      leaguePpg: 112,
      possessionCoefficient: 1,
    },
    snapshotId: 'snap',
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
    userTeamId,
  }
}

function seedDraftPicksForOrder(
  league: LeagueState,
  order: { teamId: string; pickNumber: number }[],
  seasonLabel: string,
): void {
  const teamCount = order.length
  league.draftPicks = order.flatMap((o) => [
    {
      id: `r1-${o.teamId}`,
      season: seasonLabel,
      round: 1,
      pickNumber: o.pickNumber,
      originalTeamId: o.teamId,
      currentTeamId: o.teamId,
      prospectId: null,
    },
    {
      id: `r2-${o.teamId}`,
      season: seasonLabel,
      round: 2,
      pickNumber: teamCount + o.pickNumber,
      originalTeamId: o.teamId,
      currentTeamId: o.teamId,
      prospectId: null,
    },
  ])
}

describe('syncDraftClock', () => {
  it('does not mark complete when unpicked assets have pickNumber 0', () => {
    const league = makeMiniLeague()
    const seasonLabel = '2027-28'
    league.draftPicks = [
      {
        id: 'p1',
        season: seasonLabel,
        round: 1,
        pickNumber: 0,
        originalTeamId: 't0',
        currentTeamId: 't0',
        prospectId: null,
      },
    ]
    const draftClass = generateDraftClass(
      2027,
      DEFAULT_LEAGUE_RULES,
      [],
      new SeededRandom({ seed: '1', position: 0 }),
    )
    const draft = startDraft(league, draftClass, [], 'lottery')
    draft.seasonYear = 2027

    syncDraftClock(league, draft)
    expect(draft.status).toBe('in_progress')
    expect(draft.completedAt).toBeUndefined()
  })

  it('does not skip ahead when lower slots are unnumbered', () => {
    const league = makeSizedLeague(30, 'user')
    const teamIds = Object.keys(league.teams).filter((id) => id !== 'user')
    const order: { teamId: string; pickNumber: number }[] = []
    for (let pickNumber = 1; pickNumber <= 30; pickNumber++) {
      if (pickNumber === 8) {
        order.push({ teamId: 'user', pickNumber })
      } else {
        const idx = pickNumber < 8 ? pickNumber - 1 : pickNumber - 2
        order.push({ teamId: teamIds[idx]!, pickNumber })
      }
    }
    const seasonLabel = '2027-28'
    seedDraftPicksForOrder(league, order, seasonLabel)
    for (const pick of league.draftPicks) {
      if (
        pick.season === seasonLabel &&
        pick.round === 1 &&
        pick.pickNumber >= 1 &&
        pick.pickNumber <= 7
      ) {
        pick.pickNumber = 0
      }
    }
    const dc = generateDraftClass(
      2027,
      DEFAULT_LEAGUE_RULES,
      [],
      new SeededRandom({ seed: 'gap', position: 0 }),
    )
    const draft = startDraft(league, dc, order, 'lottery')
    draft.seasonYear = 2027

    syncDraftClock(league, draft)
    expect(draft.currentPickNumber).toBe(1)
    expect(isUserOnClock(league, draft, 'user')).toBe(false)
  })
})

describe('reconcileDraftPickState', () => {
  const rng = new SeededRandom({ seed: 'reconcile', position: 0 })

  it('clears phantom asset marks and resets clock when feed has gaps', () => {
    const league = makeSizedLeague(30, 'user')
    const teamIds = Object.keys(league.teams).filter((id) => id !== 'user')
    const order: { teamId: string; pickNumber: number }[] = []
    for (let pickNumber = 1; pickNumber <= 30; pickNumber++) {
      if (pickNumber === 8) {
        order.push({ teamId: 'user', pickNumber })
      } else {
        const idx = pickNumber < 8 ? pickNumber - 1 : pickNumber - 2
        order.push({ teamId: teamIds[idx]!, pickNumber })
      }
    }
    const seasonLabel = '2027-28'
    seedDraftPicksForOrder(league, order, seasonLabel)
    const dc = generateDraftClass(2027, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const draft = startDraft(league, dc, order, 'lottery')
    draft.seasonYear = 2027

    for (let i = 1; i <= 23; i++) {
      const asset = league.draftPicks.find(
        (p) => p.season === seasonLabel && p.pickNumber === i,
      )
      if (asset) asset.prospectId = `phantom-${i}`
    }

    const pick22Asset = league.draftPicks.find(
      (p) => p.season === seasonLabel && p.pickNumber === 22,
    )!
    const pick23Asset = league.draftPicks.find(
      (p) => p.season === seasonLabel && p.pickNumber === 23,
    )!
    draft.picks.push({
      id: 'logged-22',
      draftId: draft.id,
      pickId: pick22Asset.id,
      prospectId: dc.prospects[0]!.id,
      pickedByTeamId: pick22Asset.currentTeamId,
      pickNumber: 22,
      round: 1,
      isTwoWay: false,
    })
    draft.picks.push({
      id: 'logged-23',
      draftId: draft.id,
      pickId: pick23Asset.id,
      prospectId: dc.prospects[1]!.id,
      pickedByTeamId: pick23Asset.currentTeamId,
      pickNumber: 23,
      round: 1,
      isTwoWay: false,
    })
    pick22Asset.prospectId = dc.prospects[0]!.id
    pick23Asset.prospectId = dc.prospects[1]!.id
    draft.currentPickNumber = 24

    const changed = reconcileDraftPickState(league, draft)
    syncDraftClock(league, draft)

    expect(changed).toBe(true)
    expect(draft.currentPickNumber).toBe(1)
    expect(
      league.draftPicks.filter(
        (p) =>
          p.season === seasonLabel &&
          p.pickNumber >= 1 &&
          p.pickNumber <= 21 &&
          p.prospectId != null,
      ),
    ).toHaveLength(0)
    expect(pick22Asset.prospectId).toBe(dc.prospects[0]!.id)
    expect(pick23Asset.prospectId).toBe(dc.prospects[1]!.id)
  })
})

describe('user pick slot vs draft clock', () => {
  const rng = new SeededRandom({ seed: 'slot24', position: 0 })

  it('user at slot 24 is not on the clock at pick 1', () => {
    const league = makeSizedLeague(30, 'user')
    const order = Array.from({ length: 30 }, (_, i) => ({
      teamId: `t${i === 0 ? 1 : i === 1 ? 0 : i}`,
      pickNumber: i + 1,
    }))
    order[23] = { teamId: 'user', pickNumber: 24 }
    order[0] = { teamId: 't1', pickNumber: 1 }

    const seasonLabel = '2027-28'
    seedDraftPicksForOrder(league, order, seasonLabel)
    const dc = generateDraftClass(2027, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const draft = startDraft(league, dc, order, 'lottery')
    draft.seasonYear = 2027

    const owner = getCurrentPickOwner(league, draft)
    expect(owner?.teamId).toBe('t1')
    expect(owner?.teamId).not.toBe('user')

    const slots = getUserDraftPickSlots(league, 2027, 'user')
    expect(slots.map((s) => s.pickNumber)).toContain(24)
    expect(picksUntilUserTurn(draft, slots)).toBe(23)
  })

  it('autoPickForTeam advances clock from pick 1 when user holds pick 24', () => {
    const league = makeSizedLeague(30, 'user')
    const order: { teamId: string; pickNumber: number }[] = []
    for (let i = 1; i <= 30; i++) {
      order.push({ teamId: i === 24 ? 'user' : `t${i}`, pickNumber: i })
    }
    order[0] = { teamId: 't1', pickNumber: 1 }

    const seasonLabel = '2027-28'
    seedDraftPicksForOrder(league, order, seasonLabel)
    const dc = generateDraftClass(2027, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const draft = startDraft(league, dc, order, 'lottery')
    draft.seasonYear = 2027

    const result = autoPickForTeam(league, draft, 't1', rng)
    expect(result).not.toBeNull()
    expect('error' in (result ?? {})).toBe(false)
    expect(draft.currentPickNumber).toBe(2)
    expect(countPicksMade(draft)).toBe(1)
  })

  it('simulates picks 1-23 before user is on clock at 24', () => {
    const league = makeSizedLeague(30, 'user')
    const teamIds = Object.keys(league.teams).filter((id) => id !== 'user')
    const order: { teamId: string; pickNumber: number }[] = []
    for (let pickNumber = 1; pickNumber <= 30; pickNumber++) {
      if (pickNumber === 24) {
        order.push({ teamId: 'user', pickNumber })
      } else {
        const idx = pickNumber < 24 ? pickNumber - 1 : pickNumber - 2
        order.push({ teamId: teamIds[idx]!, pickNumber })
      }
    }

    const seasonLabel = '2027-28'
    seedDraftPicksForOrder(league, order, seasonLabel)
    const dc = generateDraftClass(2027, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const draft = startDraft(league, dc, order, 'lottery')
    draft.seasonYear = 2027

    for (let i = 0; i < 23; i++) {
      const owner = getCurrentPickOwner(league, draft)!
      expect(owner.teamId).not.toBe('user')
      const result = autoPickForTeam(league, draft, owner.teamId, rng)
      expect(result).not.toBeNull()
      expect('error' in (result ?? {})).toBe(false)
    }

    const owner = getCurrentPickOwner(league, draft)
    expect(owner?.teamId).toBe('user')
    expect(draft.currentPickNumber).toBe(24)
    expect(countPicksMade(draft)).toBe(23)
  })
})

describe('getUserDraftPickSlots', () => {
  it('returns unpicked numbered slots for the user', () => {
    const league = makeSizedLeague(30, 'user')
    const seasonLabel = '2027-28'
    league.draftPicks = [
      {
        id: 'u-r1',
        season: seasonLabel,
        round: 1,
        pickNumber: 24,
        originalTeamId: 'user',
        currentTeamId: 'user',
        prospectId: null,
      },
      {
        id: 'u-r2',
        season: seasonLabel,
        round: 2,
        pickNumber: 54,
        originalTeamId: 'user',
        currentTeamId: 'user',
        prospectId: null,
      },
    ]

    const slots = getUserDraftPickSlots(league, 2027, 'user')
    expect(slots.map((s) => s.pickNumber)).toEqual([24, 54])
  })
})

describe('repairDraftPickOrder mid-draft', () => {
  const rng = new SeededRandom({ seed: 'repair', position: 0 })

  it('does not reshuffle lottery after picks are made', () => {
    const league = makeMiniLeague()
    const seasonLabel = '2027-28'
    const order = runLottery(league, rng)
    seedDraftPicksForOrder(league, order, seasonLabel)
    const dc = generateDraftClass(2027, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const draft = startDraft(league, dc, order, 'lottery')
    draft.seasonYear = 2027
    draft.lotteryResults = order

    simulateDraftPick(
      league,
      draft,
      order[0]!.teamId,
      dc.prospects[0]!.id,
      false,
      rng,
    )

    for (const pick of league.draftPicks) {
      if (!pick.prospectId && pick.season === seasonLabel) {
        pick.pickNumber = 0
      }
    }

    draft.lotteryResults = undefined
    const repaired = repairDraftPickOrder(league, draft, rng)
    expect(repaired).toBe(false)
    expect(draft.picks).toHaveLength(1)
  })
})

describe('forfeitDraftPick', () => {
  const rng = new SeededRandom({ seed: 'forfeit', position: 0 })

  it('records forfeited sentinel in draft picks', () => {
    const league = makeMiniLeague()
    const dc = generateDraftClass(2027, DEFAULT_LEAGUE_RULES, [], rng)
    league.draftClasses[dc.id] = dc
    const order = runInverseWLDraftOrder(league)
    seedDraftPicksForOrder(league, order, '2027-28')
    const draft = startDraft(league, dc, order, 'inverse_record')
    draft.seasonYear = 2027

    const ok = forfeitDraftPick(league, draft)
    expect(ok).toBe(true)
    expect(draft.picks.some((p) => p.prospectId === FORFEITED_PROSPECT_ID)).toBe(
      true,
    )
    expect(countPicksMade(draft)).toBe(0)
  })
})

describe('getDraftOrderBoard', () => {
  it('includes traded pick ownership', () => {
    const league = makeMiniLeague()
    const order = runInverseWLDraftOrder(league)
    seedDraftPicksForOrder(league, order, '2027-28')
    const traded = league.draftPicks.find(
      (p) => p.round === 1 && p.originalTeamId === order[0]!.teamId,
    )!
    traded.currentTeamId = 't3'

    const dc = generateDraftClass(
      2027,
      DEFAULT_LEAGUE_RULES,
      [],
      new SeededRandom({ seed: '1', position: 0 }),
    )
    const draft = startDraft(league, dc, order, 'inverse_record')
    draft.seasonYear = 2027

    const board = getDraftOrderBoard(league, draft)
    const entry = board.find((e) => e.pickNumber === 1)
    expect(entry?.currentTeamId).toBe('t3')
    expect(entry?.traded).toBe(true)
  })
})
