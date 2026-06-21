import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamStrategyPage } from '@/pages/TeamStrategyPage'
import { defaultStrategy } from '@/game/models/defaults'

const mockUseGameStore = vi.fn()
vi.mock('@/store/useGameStore', () => ({
  useGameStore: (selector: (s: unknown) => unknown): unknown => mockUseGameStore(selector),
}))

describe('TeamStrategyPage', () => {
  it('renders strategy editor for user team', () => {
    const state = {
      save: {
        league: {
          userTeamId: 't1',
          teams: {
            t1: {
              id: 't1',
              strategy: defaultStrategy(),
            },
          },
        },
      },
      setTeamStrategy: vi.fn(),
    }
    mockUseGameStore.mockImplementation((selector: (s: typeof state) => unknown) => selector(state))

    render(<TeamStrategyPage />)
    expect(screen.getByText('Team Strategy')).toBeInTheDocument()
    expect(screen.getByText('Save strategy')).toBeInTheDocument()
  })
})
