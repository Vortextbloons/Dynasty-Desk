import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PickProtectionBadge } from '@/components/trade/PickProtectionBadge'

describe('PickProtectionBadge', () => {
  it('renders plain label when no protection, freeze, or stepien', () => {
    render(<PickProtectionBadge pickLabel="1st" />)
    expect(screen.getByText('1st')).toBeInTheDocument()
  })

  it('renders protection label when protected', () => {
    render(<PickProtectionBadge protection="1-10" pickLabel="1st" />)
    expect(screen.getByText(/top-1-10/)).toBeInTheDocument()
  })

  it('renders FROZEN when frozenUntilSeason is set', () => {
    render(<PickProtectionBadge frozenUntilSeason="2032-26" pickLabel="1st" />)
    expect(screen.getByText('FROZEN')).toBeInTheDocument()
  })

  it('renders STEPIEN when stepienBlocked', () => {
    render(<PickProtectionBadge stepienBlocked pickLabel="1st" />)
    expect(screen.getByText('STEPIEN')).toBeInTheDocument()
  })

  it('renders multiple badges when both protection and freeze are set', () => {
    render(
      <PickProtectionBadge
        protection="1-5"
        frozenUntilSeason="2030-26"
        pickLabel="Pick"
      />,
    )
    expect(screen.getByText(/top-1-5/)).toBeInTheDocument()
    expect(screen.getByText('FROZEN')).toBeInTheDocument()
  })
})
