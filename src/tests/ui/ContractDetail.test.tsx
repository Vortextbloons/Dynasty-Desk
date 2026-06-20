import { render, screen } from '@testing-library/react'
import { ContractDetail } from '@/components/player/ContractDetail'
import { emptyContract } from '@/game/models/contract'
import { describe, it, expect } from 'vitest'

function makeContract(overrides?: { noTradeClause?: boolean; salaryByYear?: number[] }) {
  const contract = emptyContract(30_000_000, 3)
  if (overrides?.noTradeClause !== undefined) contract.noTradeClause = overrides.noTradeClause
  if (overrides?.salaryByYear) contract.salaryByYear = overrides.salaryByYear
  return contract
}

describe('ContractDetail', () => {
  it('renders salary amounts', () => {
    render(<ContractDetail contract={makeContract()} />)

    expect(screen.getAllByText('$30.0M').length).toBeGreaterThanOrEqual(1)
  })

  it('renders NTC chip when noTradeClause is true', () => {
    render(<ContractDetail contract={makeContract({ noTradeClause: true })} />)

    expect(screen.getByText('NTC')).toBeInTheDocument()
  })

  it('renders "No" for NTC when noTradeClause is false', () => {
    render(<ContractDetail contract={makeContract({ noTradeClause: false })} />)

    expect(screen.queryByText('NTC')).not.toBeInTheDocument()
  })
})
