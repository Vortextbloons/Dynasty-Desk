import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TrainingPage } from '@/pages/TrainingPage'

const mockUseGameStore = vi.fn()
vi.mock('@/store/useGameStore', () => ({
  useGameStore: (selector: (s: unknown) => unknown): unknown => mockUseGameStore(selector),
}))

describe('TrainingPage', () => {
  it('renders team training focus when save is loaded', () => {
    const state = {
      save: {
        league: {
          userTeamId: 't1',
          teams: {
            t1: {
              id: 't1',
              trainingFocus: 'balanced',
              roster: ['p1'],
              lineup: { targetMinutes: { p1: 32 } },
              loadManagement: [],
            },
          },
          players: {
            p1: {
              id: 'p1',
              firstName: 'Test',
              lastName: 'Player',
              ratings: { overall: 80 },
              development: { trainingFocus: 'balanced' },
            },
          },
        },
      },
      setTeamTrainingFocus: vi.fn(),
      setTrainingFocus: vi.fn(),
      setLoadManagement: vi.fn(),
    }
    mockUseGameStore.mockImplementation((selector: (s: typeof state) => unknown) => selector(state))

    render(<MemoryRouter><TrainingPage /></MemoryRouter>)
    expect(screen.getByText('Training')).toBeInTheDocument()
    expect(screen.getByText('Team training focus')).toBeInTheDocument()
    expect(screen.getByText('Test Player')).toBeInTheDocument()
  })
})
