import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CompareView } from '@/components/player/CompareView'
import type { Player } from '@/game/models'
import { describe, it, expect } from 'vitest'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    firstName: 'LeBron',
    lastName: 'James',
    position: 'SF',
    secondaryPositions: [],
    age: 40,
    heightInches: 81,
    weightLbs: 250,
    teamId: 't1',
    ratings: {
      insideScoring: 80,
      closeShot: 78,
      midrange: 72,
      threePoint: 74,
      freeThrow: 75,
      ballHandling: 80,
      passing: 85,
      offensiveIq: 85,
      offensiveRebound: 45,
      defensiveRebound: 60,
      perimeterDefense: 70,
      interiorDefense: 60,
      steal: 55,
      block: 40,
      defensiveIq: 85,
      speed: 72,
      strength: 80,
      vertical: 65,
      stamina: 80,
      durability: 80,
      clutch: 80,
      consistency: 80,
      potential: 40,
      overall: 90,
    },
    tendencies: {
      usageRate: 28,
      passRate: 20,
      shotRate: 25,
      driveRate: 15,
      postUpRate: 5,
      rimFrequency: 30,
      shortMidFrequency: 10,
      longMidFrequency: 10,
      cornerThreeFrequency: 5,
      aboveBreakThreeFrequency: 30,
      threePointRate: 35,
      freeThrowRate: 25,
      turnoverRate: 10,
      isolationRate: 10,
      pickAndRollBallHandlerRate: 20,
      pickAndRollRollManRate: 5,
      spotUpRate: 15,
      transitionRate: 15,
      cutRate: 5,
      foulRate: 2,
      stealAttemptRate: 5,
      blockAttemptRate: 3,
      crashOffensiveGlassRate: 8,
    },
    traits: {
      workEthic: 80,
      loyalty: 70,
      ego: 50,
      greed: 40,
      leadership: 80,
      coachability: 80,
      injuryRisk: 30,
      shotCreation: 75,
      defensiveVersatility: 70,
    },
    contract: {
      salaryByYear: [30_000_000],
      yearsRemaining: 1,
      option: 'none',
      optionYear: null,
      noTradeClause: false,
      signingBonusByYear: [0],
      likelyBonusesByYear: [0],
      unlikelyBonusesByYear: [0],
      guaranteed: true,
      guaranteedByYear: [true],
      tradeKickers: [],
      poisonPill: false,
      birdRights: false,
      earlyBird: false,
      baseYearCompensation: false,
      deferredMoney: [],
    },
    morale: {
      level: 70,
      happiness: 75,
      roleSatisfaction: 70,
      teamSatisfaction: 65,
      tradeRequest: false,
      tradeRequestLevel: 0,
    },
    health: {
      status: 'healthy',
      injuryDescription: null,
      daysRemaining: 0,
      gamesRemaining: 0,
    },
    development: {
      lastTrainedAt: null,
      focusArea: null,
      recentForm: 0,
      ageAtPeak: 28,
      progressionCurve: 'veteran_decline',
      ratingsDelta: {},
      breakoutChance: 0,
      bustRisk: 0,
    },
    seasonStats: {
      season: '2025-26',
      teamId: 't1',
      gamesPlayed: 0,
      minutes: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      plusMinus: 0,
    },
    careerStats: [],
    historicalSeasons: [],
    ...overrides,
  } as Player
}

const playerA = makePlayer({
  id: 'p1',
  firstName: 'LeBron',
  lastName: 'James',
  ratings: { ...makePlayer().ratings, overall: 90 },
})

const playerB = makePlayer({
  id: 'p2',
  firstName: 'Jayson',
  lastName: 'Tatum',
  ratings: { ...makePlayer().ratings, overall: 88 },
})

describe('CompareView', () => {
  it('renders both player names', () => {
    render(
      <MemoryRouter>
        <CompareView left={playerA} right={playerB} />
      </MemoryRouter>,
    )

    expect(screen.getByText('LeBron James')).toBeInTheDocument()
    expect(screen.getByText('Jayson Tatum')).toBeInTheDocument()
  })

  it('renders Open links for both players', () => {
    render(
      <MemoryRouter>
        <CompareView left={playerA} right={playerB} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Open LeBron James')).toBeInTheDocument()
    expect(screen.getByText('Open Jayson Tatum')).toBeInTheDocument()
  })
})
