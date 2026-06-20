import { describe, it, expect } from 'vitest'
import { transitionToOffseason } from '@/game/league/offseasonTransition'
import {
  beginOffseason,
  advancePhase,
  canAdvancePhase,
  mergeCompensationPicksIntoDraftPicks,
  upcomingDraftYear,
} from '@/game/league/offseasonEngine'
import {
  prepareDraftClass,
  getDraftClassForYear,
  assignPickNumbers,
  extendDraftClassToSlotCount,
  countDraftSlots,
  autoDraftOffClock,
  startDraft,
  forfeitDraftPick,
  formatSeasonLabel,
} from '@/game/league/draftEngine'
import { finalizeStrandedFreeAgents, identifyFreeAgents } from '@/game/management/freeAgencyEngine'
import { makeTeam, makeRoster, emptyM10LeagueFields } from '@/tests/fixtures'
import type { LeagueState } from '@/game/models/league'
import type { Draft } from '@/game/models/draft'
import { DEFAULT_LEAGUE_RULES } from '@/game/models/leagueRules'
import { SeededRandom } from '@/game/sim/rng'

function makeOffseasonLeague(phase: LeagueState['phase'] = 'offseason'): LeagueState {
  const teams: LeagueState['teams'] = {}
  const players: LeagueState['players'] = {}
  const t1 = makeTeam({ id: 'user', abbreviation: 'USR' })
  const t2 = makeTeam({ id: 'other', abbreviation: 'OTH' })
  teams[t1.id] = t1
  teams[t2.id] = t2
  for (const t of [t1, t2]) {
    for (const p of makeRoster(t.id, 5)) {
      players[p.id] = p
      t.roster.push(p.id)
    }
  }

  return {
    id: 'league',
    name: 'Test',
    currentDate: '2026-07-01',
    seasonYear: 2026,
    phase,
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
    players,
    games: {},
    standings: {},
    scheduleGenerated: false,
    transactions: [],
    news: [],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    ...emptyM10LeagueFields(),
    champions: [],
    awards: [],
    activeProposals: [],
    userTeamId: 'user',
  }
}

describe('offseasonEngine', () => {
  const rng = new SeededRandom({ seed: 'offseason-test', position: 0 })

  it('beginOffseason prepares draft class and scouting without duplicate championship work', () => {
    const league = makeOffseasonLeague('playoffs')
    const bonusBefore = league.teams.user!.finances.seasonPerformanceBonus

    beginOffseason(league, rng)

    expect(league.phase).toBe('offseason')
    expect(league.rosterSizeCap).toBe(20)
    const draftClass = league.draftClasses[Object.keys(league.draftClasses)[0]!]
    expect(draftClass?.prospects.length).toBe(60)
    expect(league.scoutingState[`user-${draftClass!.id}`]?.pointsRemaining).toBe(100)
    expect(league.teams.user!.finances.seasonPerformanceBonus).toBe(bonusBefore)
    expect(league.news.filter((n) => n.type === 'offseason_begins')).toHaveLength(0)
  })

  it('transition + beginOffseason does not double performance bonuses', () => {
    const league = makeOffseasonLeague('playoffs')
    league.playoffBracket = {
      seasonYear: 2026,
      format: 'top8',
      east: [],
      west: [],
      finals: {
        id: 'finals',
        conference: 'Finals',
        round: 4,
        higherSeedTeamId: 'user',
        lowerSeedTeamId: 'other',
        higherSeed: 1,
        lowerSeed: 2,
        seriesLength: 7,
        higherSeedWins: 4,
        lowerSeedWins: 2,
        status: 'final',
        games: [],
        winnerTeamId: 'user',
        isUpset: false,
        startDate: '2026-06-01',
      },
      status: 'complete',
      championTeamId: 'user',
      runnerUpTeamId: 'other',
      finalsMvpPlayerId: playersFirstId(league),
    }

    transitionToOffseason(league)
    const perfAfterTransition = league.teams.user!.finances.seasonPerformanceBonus
    const cashAfterTransition = league.teams.user!.finances.cashReserves
    beginOffseason(league, rng)
    const perfAfterBegin = league.teams.user!.finances.seasonPerformanceBonus
    const cashAfterBegin = league.teams.user!.finances.cashReserves

    expect(perfAfterBegin).toBe(perfAfterTransition)
    expect(cashAfterBegin).toBe(cashAfterTransition)
    expect(league.news.filter((n) => n.type === 'offseason_begins')).toHaveLength(1)
  })

  it('blocks advancing from draft to free agency until draft is complete', async () => {
    const league = makeOffseasonLeague('draft')
    const draftYear = upcomingDraftYear(league)
    const draft: Draft = {
      id: `draft-${draftYear}`,
      seasonYear: draftYear,
      draftClassId: 'class-1',
      status: 'in_progress',
      picks: [],
      currentPickNumber: 5,
      startedAt: league.currentDate,
      orderSource: 'lottery',
    }
    league.drafts[draft.id] = draft

    const guard = canAdvancePhase(league)
    expect(guard.ok).toBe(false)

    const result = await advancePhase(league, 'user', rng)
    expect(result.blocked).toBe(true)
    expect(league.phase).toBe('draft')
  })

  it('signs rookies with matching player ids and updates payroll', async () => {
    const league = makeOffseasonLeague('draft')
    const draftYear = upcomingDraftYear(league)
    const classId = 'draft-class-test'
    league.draftClasses[classId] = {
      id: classId,
      seasonYear: draftYear,
      season: '2027-28',
      generatedAt: '',
      prospects: [
        {
          id: 'prospect-1',
          draftClassId: classId,
          firstName: 'Test',
          lastName: 'Rookie',
          age: 19,
          position: 'PG',
          secondaryPositions: [],
          heightInches: 75,
          weightLbs: 180,
          archetype: 'Guard',
          visibleRatings: {},
          trueRatings: {
            insideScoring: 60,
            closeShot: 60,
            midrange: 60,
            threePoint: 60,
            freeThrow: 60,
            ballHandling: 60,
            passing: 60,
            offensiveIq: 60,
            offensiveRebound: 50,
            defensiveRebound: 50,
            perimeterDefense: 60,
            interiorDefense: 50,
            steal: 55,
            block: 45,
            defensiveIq: 55,
            speed: 65,
            strength: 55,
            vertical: 60,
            stamina: 70,
            durability: 70,
            clutch: 55,
            consistency: 55,
            potential: 75,
            overall: 60,
          },
          visiblePotentialRange: [70, 80],
          truePotential: 75,
          projectedRange: [58, 68],
          scoutingReport: [],
          riskLevel: 'medium',
          scoutingPoints: 0,
          scoutedByTeamId: null,
          bustRisk: 0.1,
          breakoutChance: 0.1,
          source: 'synthetic',
        },
      ],
      generatedBy: 'hybrid',
      realProspectCount: 0,
      syntheticProspectCount: 1,
    }

    const pickId = 'pick-result-1'
    league.drafts[`draft-${draftYear}`] = {
      id: `draft-${draftYear}`,
      seasonYear: draftYear,
      draftClassId: classId,
      status: 'complete',
      picks: [
        {
          id: pickId,
          draftId: `draft-${draftYear}`,
          pickId: 'asset-1',
          prospectId: 'prospect-1',
          pickedByTeamId: 'user',
          pickNumber: 1,
          round: 1,
          isTwoWay: false,
        },
      ],
      currentPickNumber: 61,
      startedAt: league.currentDate,
      completedAt: league.currentDate,
      orderSource: 'lottery',
    }

    const payrollBefore = league.teams.user!.finances.payroll
    league.phase = 'draft'
    const result = await advancePhase(league, 'user', rng)
    expect(result.blocked).toBeUndefined()
    expect(league.phase).toBe('free_agency')

    const player = league.players['player-prospect-1']
    expect(player).toBeDefined()
    expect(player!.teamId).toBe('user')
    expect(league.teams.user!.finances.payroll).toBeGreaterThan(payrollBefore)
  })

  it('merges compensation picks into draftPicks', () => {
    const league = makeOffseasonLeague()
    league.compensationPicks = [
      {
        id: 'comp-1',
        seasonYear: 2027,
        round: 2,
        originalTeamId: 'user',
        currentTeamId: 'user',
        reason: 'outgoing_free_agent',
        amount: 12_000_000,
        threshold: 'standard',
        playerId: 'p1',
      },
    ]
    mergeCompensationPicksIntoDraftPicks(league)
    expect(league.draftPicks.some((p) => p.id === 'comp-1')).toBe(true)
    expect(league.draftPicks.find((p) => p.id === 'comp-1')?.pickNumber).toBe(0)
  })

  it('prepareDraftClass replaces placeholder when real data is available', () => {
    const league = makeOffseasonLeague()
    beginOffseason(league, rng)
    const draftYear = upcomingDraftYear(league)
    const placeholder = getDraftClassForYear(league, draftYear)!
    expect(placeholder.realProspectCount).toBe(0)

    prepareDraftClass(league, draftYear, league.rules, [
      {
        firstName: 'Cooper',
        lastName: 'Flagg',
        age: 19,
        position: 'SF',
        heightInches: 81,
        weightLbs: 205,
        archetype: 'two_way_wing',
      },
    ], rng)

    const hydrated = getDraftClassForYear(league, draftYear)!
    expect(hydrated.realProspectCount).toBe(1)
    expect(hydrated.prospects.some((p) => p.lastName === 'Flagg')).toBe(true)
    expect(league.scoutingState[`user-${hydrated.id}`]?.pointsRemaining).toBe(100)
  })

  it('assigns unique pick numbers when a team has a normal and compensation second-round pick', () => {
    const league = makeOffseasonLeague()
    const seasonLabel = '2027-28'
    league.draftPicks = [
      { id: 'r1-user', season: seasonLabel, round: 1, pickNumber: 0, originalTeamId: 'user', currentTeamId: 'user', prospectId: null },
      { id: 'r1-other', season: seasonLabel, round: 1, pickNumber: 0, originalTeamId: 'other', currentTeamId: 'other', prospectId: null },
      { id: 'r2-user', season: seasonLabel, round: 2, pickNumber: 0, originalTeamId: 'user', currentTeamId: 'user', prospectId: null },
      { id: 'r2-other', season: seasonLabel, round: 2, pickNumber: 0, originalTeamId: 'other', currentTeamId: 'other', prospectId: null },
    ]
    league.compensationPicks = [
      {
        id: 'comp-user-extra',
        seasonYear: 2027,
        round: 2,
        originalTeamId: 'user',
        currentTeamId: 'user',
        reason: 'outgoing_free_agent',
        amount: 15_000_000,
        threshold: 'standard',
        playerId: 'p1',
      },
    ]
    mergeCompensationPicksIntoDraftPicks(league)
    assignPickNumbers(
      league,
      [
        { teamId: 'user', pickNumber: 1 },
        { teamId: 'other', pickNumber: 2 },
      ],
      seasonLabel,
    )

    const userPickNumbers = league.draftPicks
      .filter((p) => p.originalTeamId === 'user' && p.season === seasonLabel)
      .map((p) => p.pickNumber)
      .filter((n) => n > 0)

    expect(new Set(userPickNumbers).size).toBe(userPickNumbers.length)
    expect(league.draftPicks.find((p) => p.id === 'comp-user-extra')?.pickNumber).toBe(5)
  })

  it('blocks preseason to regular season while unsigned free agents remain', () => {
    const league = makeOffseasonLeague('preseason')
    const fa = makeRoster('other', 1)[0]!
    fa.teamId = null
    fa.contract.yearsRemaining = 0
    league.players[fa.id] = fa

    const guard = canAdvancePhase(league)
    expect(guard.ok).toBe(false)
    if (!guard.ok) {
      expect(guard.reason).toContain('unsigned')
    }
  })

  it('finalizeStrandedFreeAgents clears preseason advance block', () => {
    const league = makeOffseasonLeague('preseason')
    const fa = makeRoster('other', 1)[0]!
    fa.teamId = null
    fa.contract.yearsRemaining = 0
    league.players[fa.id] = fa

    finalizeStrandedFreeAgents(league, rng)
    expect(identifyFreeAgents(league).length).toBe(0)
    expect(canAdvancePhase(league).ok).toBe(true)
  })

  it('extends draft class when compensation picks add extra slots beyond 60', () => {
    const league = makeOffseasonLeague()
    beginOffseason(league, rng)
    const draftYear = upcomingDraftYear(league)
    const draftClass = getDraftClassForYear(league, draftYear)!
    expect(draftClass.prospects.length).toBe(60)

    const seasonLabel = formatSeasonLabel(draftYear)
    league.draftPicks = Array.from({ length: 61 }, (_, i) => ({
      id: `pick-${i + 1}`,
      season: seasonLabel,
      round: i < 30 ? 1 : 2,
      pickNumber: i + 1,
      originalTeamId: i % 2 === 0 ? 'user' : 'other',
      currentTeamId: i % 2 === 0 ? 'user' : 'other',
      prospectId: null,
    }))

    extendDraftClassToSlotCount(league, draftClass, draftYear, rng)
    expect(draftClass.prospects.length).toBe(61)
    expect(countDraftSlots(league, draftYear)).toBe(61)
  })

  it('autoDraftOffClock forfeit completes draft when prospects are exhausted', () => {
    const league = makeOffseasonLeague('draft')
    const draftYear = upcomingDraftYear(league)
    const classId = `draft-class-${draftYear}`
    const prospect = {
      id: 'prospect-only',
      draftClassId: classId,
      firstName: 'Only',
      lastName: 'Pick',
      age: 19,
      position: 'PG' as const,
      secondaryPositions: [] as import('@/game/models/position').Position[],
      heightInches: 75,
      weightLbs: 180,
      archetype: 'Guard',
      visibleRatings: {},
      trueRatings: makeRoster('other', 1)[0]!.ratings,
      visiblePotentialRange: [70, 80] as [number, number],
      truePotential: 75,
      projectedRange: [58, 68] as [number, number],
      scoutingReport: [],
      riskLevel: 'medium' as const,
      scoutingPoints: 0,
      scoutedByTeamId: null,
      bustRisk: 0.1,
      breakoutChance: 0.1,
      source: 'synthetic' as const,
    }
    league.draftClasses[classId] = {
      id: classId,
      seasonYear: draftYear,
      season: formatSeasonLabel(draftYear),
      generatedAt: '',
      prospects: [prospect],
      generatedBy: 'hybrid',
      realProspectCount: 0,
      syntheticProspectCount: 1,
    }
    const seasonLabel = formatSeasonLabel(draftYear)
    league.draftPicks = [
      { id: 'p1', season: seasonLabel, round: 1, pickNumber: 1, originalTeamId: 'other', currentTeamId: 'other', prospectId: null },
      { id: 'p2', season: seasonLabel, round: 1, pickNumber: 2, originalTeamId: 'user', currentTeamId: 'user', prospectId: null },
    ]
    const draft = startDraft(
      league,
      league.draftClasses[classId]!,
      [
        { teamId: 'other', pickNumber: 1 },
        { teamId: 'user', pickNumber: 2 },
      ],
      'lottery',
    )

    autoDraftOffClock(league, draft, 'user', rng)
    expect(draft.picks.length).toBe(1)
    expect(draft.currentPickNumber).toBe(2)
    expect(draft.status).toBe('in_progress')

    forfeitDraftPick(league, draft)
    expect(draft.status).toBe('complete')
    expect(draft.picks.some((p) => p.prospectId === '__forfeited__')).toBe(true)
  })
})

function playersFirstId(league: LeagueState): string {
  return Object.keys(league.players)[0]!
}
