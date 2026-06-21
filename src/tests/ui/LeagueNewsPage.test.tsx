import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LeagueNewsPage } from '@/pages/LeagueNewsPage'

const mockUseGameStore = vi.fn()
vi.mock('@/store/useGameStore', () => ({
  useGameStore: (selector: (s: unknown) => unknown): unknown => mockUseGameStore(selector),
}))

describe('LeagueNewsPage', () => {
  it('renders league news items', () => {
    const state = {
      save: {
        league: {
          phase: 'regular_season',
          news: [
            {
              id: 'n1',
              date: '2026-01-01',
              type: 'player_injury',
              headline: 'Star player injured',
              body: 'Out 2 weeks',
              teamIds: [],
              playerIds: [],
              importance: 'medium',
            },
          ],
        },
      },
      advancePhase: vi.fn(),
      markNewsRead: vi.fn(),
      markAllNewsRead: vi.fn(),
      filterNews: () => state.save.league.news,
    }
    mockUseGameStore.mockImplementation((selector: (s: typeof state) => unknown) => selector(state))

    render(
      <MemoryRouter>
        <LeagueNewsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('League News')).toBeInTheDocument()
    expect(screen.getByText('Star player injured')).toBeInTheDocument()
  })
})
