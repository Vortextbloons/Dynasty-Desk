import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AwardsPage } from '@/pages/AwardsPage'

const mockUseGameStore = vi.fn()
vi.mock('@/store/useGameStore', () => ({
  useGameStore: (selector: (s: unknown) => unknown): unknown => mockUseGameStore(selector),
}))

describe('AwardsPage', () => {
  it('renders current award races', () => {
    const state = {
      save: {
        league: {
          awardRaces: {
            mvp: [{ playerId: 'p1', teamId: 't1', statLine: '30.0 PPG' }],
          },
          awardsHistory: [],
          players: {
            p1: { id: 'p1', firstName: 'Star', lastName: 'Player' },
          },
        },
      },
    }
    mockUseGameStore.mockImplementation((selector: (s: typeof state) => unknown) => selector(state))

    render(<AwardsPage />)
    expect(screen.getByText('Awards')).toBeInTheDocument()
    expect(screen.getByText(/Star Player/)).toBeInTheDocument()
  })
})
