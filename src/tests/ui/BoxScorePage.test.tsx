import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { BoxScorePage } from '@/pages/BoxScorePage'
import type { GameSave } from '@/game/models'
import { emptyM10LeagueFields } from '@/tests/fixtures'

const mockUseGameStore = vi.fn()
vi.mock('@/store/useGameStore', () => ({
  useGameStore: (selector: any) => mockUseGameStore(selector),
}))

function makeSave(): GameSave {
  return {
    metadata: {
      id: 'save-1',
      name: 'Dynasty',
      createdAt: '2025-10-21',
      updatedAt: '2025-10-21',
      appVersion: '0.1.0',
      schemaVersion: 4,
      teamId: 't-home',
      teamName: 'Home',
      currentSeason: 2025,
      currentDate: '2025-10-21',
      leagueName: 'Dynasty',
      snapshotId: 'nba-2025-26',
      notes: '',
    },
    user: { managerName: 'GM', teamId: 't-home' },
    settings: {
      difficulty: 'pro',
      simSpeed: 'normal',
      autoSave: true,
      injuries: true,
      fatigue: true,
      salaryCap: true,
      startSeason: '2025-26',
      snapshotId: 'nba-2025-26',
    },
    rngState: { seed: 's', position: 0 },
    league: {
      id: 'l1',
      name: 'Dynasty',
      currentDate: '2025-10-21',
      seasonYear: 2025,
      phase: 'regular_season',
      rules: {} as any,
      eraConfig: {} as any,
      snapshotId: 'nba-2025-26',
      userTeamId: 't-home',
      teams: {
        't-home': {
          id: 't-home',
          city: 'Los Angeles',
          name: 'Lakers',
          abbreviation: 'LAL',
          conference: 'West',
          division: 'Pacific',
          colors: { primary: '#552583', secondary: '#FDB927' },
          roster: ['p1', 'p2', 'p3', 'p4', 'p5'],
          lineup: {
            starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
            bench: [],
            closingLineup: ['p1', 'p2', 'p3', 'p4', 'p5'],
            targetMinutes: { p1: 36, p2: 36, p3: 24, p4: 24, p5: 24 },
            autoRotation: false,
          },
          strategy: {} as any,
          finances: {} as any,
          direction: 'middle',
          chemistry: 50,
          morale: 50,
          prestige: 80,
          tradeExceptions: [],
          frozenPicks: [],
          priorTaxpayerYears: 0,
          taxpayerHistory: [],
          trainingFocus: 'balanced',
          loadManagement: [],
        },
        't-away': {
          id: 't-away',
          city: 'Boston',
          name: 'Celtics',
          abbreviation: 'BOS',
          conference: 'East',
          division: 'Atlantic',
          colors: { primary: '#007A33', secondary: '#BA9653' },
          roster: ['p6', 'p7', 'p8', 'p9', 'p10'],
          lineup: {
            starters: ['p6', 'p7', 'p8', 'p9', 'p10'],
            bench: [],
            closingLineup: ['p6', 'p7', 'p8', 'p9', 'p10'],
            targetMinutes: { p6: 36, p7: 36, p8: 24, p9: 24, p10: 24 },
            autoRotation: false,
          },
          strategy: {} as any,
          finances: {} as any,
          direction: 'middle',
          chemistry: 50,
          morale: 50,
          prestige: 80,
          tradeExceptions: [],
          frozenPicks: [],
          priorTaxpayerYears: 0,
          taxpayerHistory: [],
          trainingFocus: 'balanced',
          loadManagement: [],
        },
      },
      players: {
        p1: { id: 'p1', firstName: 'LeBron', lastName: 'James', position: 'SF', teamId: 't-home', age: 40 } as any,
        p2: { id: 'p2', firstName: 'A', lastName: 'Davis', position: 'PF', teamId: 't-home', age: 32 } as any,
        p3: { id: 'p3', firstName: 'A', lastName: 'Reaves', position: 'SG', teamId: 't-home', age: 27 } as any,
        p4: { id: 'p4', firstName: 'D', lastName: 'Russell', position: 'PG', teamId: 't-home', age: 28 } as any,
        p5: { id: 'p5', firstName: 'A', lastName: 'Hachimura', position: 'PF', teamId: 't-home', age: 27 } as any,
        p6: { id: 'p6', firstName: 'Jayson', lastName: 'Tatum', position: 'SF', teamId: 't-away', age: 27 } as any,
        p7: { id: 'p7', firstName: 'J', lastName: 'Brown', position: 'SG', teamId: 't-away', age: 28 } as any,
        p8: { id: 'p8', firstName: 'K', lastName: 'Porzingis', position: 'C', teamId: 't-away', age: 29 } as any,
        p9: { id: 'p9', firstName: 'D', lastName: 'White', position: 'PG', teamId: 't-away', age: 30 } as any,
        p10: { id: 'p10', firstName: 'J', lastName: 'Holiday', position: 'PG', teamId: 't-away', age: 34 } as any,
      },
      games: {
        g1: {
          id: 'g1',
          season: '2025-26',
          date: '2025-10-21',
          homeTeamId: 't-home',
          awayTeamId: 't-away',
          status: 'final',
          homeScore: 110,
          awayScore: 105,
          boxScoreId: null,
          isConference: false,
          isDivision: false,
          seasonYear: 2025,
          isUserTeamGame: false,
          boxScore: {
            homeTeamId: 't-home',
            awayTeamId: 't-away',
            homeScore: 110,
            awayScore: 105,
            homeWin: true,
            overtimeOccurred: false,
            teamStats: {
              home: {
                teamId: 't-home', points: 110, fgm: 40, fga: 80, tpm: 12, tpa: 30, ftm: 18, fta: 22,
                offensiveRebounds: 8, defensiveRebounds: 32, totalRebounds: 40,
                assists: 24, turnovers: 12, steals: 8, blocks: 5, fouls: 18,
                fastBreakPoints: 12, pointsInPaint: 48, secondChancePoints: 10, benchPoints: 28,
              },
              away: {
                teamId: 't-away', points: 105, fgm: 38, fga: 82, tpm: 10, tpa: 28, ftm: 19, fta: 23,
                offensiveRebounds: 7, defensiveRebounds: 30, totalRebounds: 37,
                assists: 22, turnovers: 14, steals: 6, blocks: 4, fouls: 20,
                fastBreakPoints: 10, pointsInPaint: 44, secondChancePoints: 8, benchPoints: 22,
              },
            },
            playerStats: {
              p1: {
                playerId: 'p1', teamId: 't-home', started: true, minutes: 36, points: 28,
                fgm: 10, fga: 18, tpm: 2, tpa: 5, ftm: 6, fta: 7,
                offensiveRebounds: 1, defensiveRebounds: 7, totalRebounds: 8,
                assists: 8, turnovers: 3, steals: 1, blocks: 1, fouls: 2, plusMinus: 12,
                shotsAtRim: { made: 4, attempted: 6 },
                shotsShortMid: { made: 2, attempted: 3 },
                shotsLongMid: { made: 1, attempted: 2 },
                shotsCornerThree: { made: 1, attempted: 1 },
                shotsAboveBreakThree: { made: 2, attempted: 4 },
              },
              p6: {
                playerId: 'p6', teamId: 't-away', started: true, minutes: 36, points: 32,
                fgm: 12, fga: 22, tpm: 3, tpa: 7, ftm: 5, fta: 6,
                offensiveRebounds: 0, defensiveRebounds: 6, totalRebounds: 6,
                assists: 4, turnovers: 2, steals: 2, blocks: 0, fouls: 3, plusMinus: -2,
                shotsAtRim: { made: 5, attempted: 7 },
                shotsShortMid: { made: 2, attempted: 4 },
                shotsLongMid: { made: 2, attempted: 3 },
                shotsCornerThree: { made: 1, attempted: 2 },
                shotsAboveBreakThree: { made: 2, attempted: 5 },
              },
            },
            keyPlays: [
              {
                type: 'shot', playerId: 'p1', teamId: 't-home',
                zone: 'above_break_three', shotType: 'pull_up', made: true,
                period: 4, timeRemainingSeconds: 60, impact: 95,
              },
            ],
          },
        },
      },
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
      rivalries: {},
      records: [],
      hallOfFame: [],
    },
  }
}

function renderWithSave(save: GameSave | null, id = 'g1') {
  mockUseGameStore.mockImplementation((selector: any) => {
    const state = {
      save,
      simOneGame: vi.fn(),
      simNextGame: vi.fn(),
    }
    return selector(state)
  })
  return render(
    <MemoryRouter initialEntries={[`/game/${id}`]}>
      <Routes>
        <Route path="/game/:id" element={<BoxScorePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BoxScorePage', () => {
  it('renders final score and team comparison', () => {
    renderWithSave(makeSave())
    expect(screen.getAllByText('110').length).toBeGreaterThan(0)
    expect(screen.getAllByText('105').length).toBeGreaterThan(0)
  })

  it('shows key plays', () => {
    renderWithSave(makeSave())
    expect(screen.getByText(/Key plays/)).toBeInTheDocument()
    expect(screen.getByText(/above-break three/)).toBeInTheDocument()
  })

  it('shows box score tables for both teams', () => {
    renderWithSave(makeSave())
    const lakersMatches = screen.getAllByText((_, el) =>
      Boolean(el && el.textContent && el.textContent.includes('Lakers') && el.textContent.includes('Box Score')),
    )
    const celticsMatches = screen.getAllByText((_, el) =>
      Boolean(el && el.textContent && el.textContent.includes('Celtics') && el.textContent.includes('Box Score')),
    )
    expect(lakersMatches.length).toBeGreaterThan(0)
    expect(celticsMatches.length).toBeGreaterThan(0)
  })

  it('shows top performers sections', () => {
    renderWithSave(makeSave())
    expect(screen.getByText(/Top — Points/)).toBeInTheDocument()
    expect(screen.getByText(/Top — Rebounds/)).toBeInTheDocument()
    expect(screen.getByText(/Top — Assists/)).toBeInTheDocument()
  })

  it('shows OT indicator when overtime occurred', () => {
    const save = makeSave()
    if (save.league.games.g1?.boxScore) {
      save.league.games.g1.boxScore.overtimeOccurred = true
    }
    renderWithSave(save)
    expect(screen.getByText(/OT/)).toBeInTheDocument()
  })

  it('handles missing box score gracefully', () => {
    const save = makeSave()
    if (save.league.games.g1) {
      save.league.games.g1.status = 'scheduled'
      save.league.games.g1.boxScore = null
      save.league.games.g1.homeScore = null
      save.league.games.g1.awayScore = null
    }
    renderWithSave(save)
    expect(screen.getByText(/not yet simulated/i)).toBeInTheDocument()
  })
})
