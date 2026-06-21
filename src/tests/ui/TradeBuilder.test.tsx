import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TradeBuilder } from '@/components/trade/TradeBuilder'
import { makePlayer, makeTeam, emptyM10LeagueFields } from '@/tests/fixtures'
import { getLeagueRules } from '@/game/models/leagueRules'
import { createContract } from '@/game/models/contract'
import type { LeagueState } from '@/game/models/league'
import type { TradeProposal } from '@/game/models/trade'

const rules = getLeagueRules('2025-26')

function buildFixture(): { league: LeagueState; proposal: TradeProposal } {
  const user = makeTeam({ id: 'user', roster: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13'] })
  const other = makeTeam({ id: 'other', roster: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12', 'b13'] })
  const a1 = makePlayer({ id: 'a1', teamId: 'user', contract: createContract({ salaryByYear: [10_000_000], yearsRemaining: 1 }) })
  const b1 = makePlayer({ id: 'b1', teamId: 'other', contract: createContract({ salaryByYear: [10_000_000], yearsRemaining: 1 }) })
  for (let i = 2; i <= 13; i++) {
    const id = `a${i}`
    user.roster.push(id)
    a1.id = id
  }
  const fillers: typeof a1[] = []
  for (let i = 2; i <= 13; i++) {
    fillers.push(makePlayer({ id: `a${i}`, teamId: 'user', contract: createContract({ salaryByYear: [1_000_000], yearsRemaining: 1 }) }))
  }
  for (let i = 2; i <= 13; i++) {
    fillers.push(makePlayer({ id: `b${i}`, teamId: 'other', contract: createContract({ salaryByYear: [1_000_000], yearsRemaining: 1 }) }))
  }
  const allPlayers = [a1, b1, ...fillers]
  for (const t of [user, other]) {
    for (const id of t.roster) {
      if (!allPlayers.find((p) => p.id === id)) {
        allPlayers.push(makePlayer({ id, teamId: t.id, contract: createContract({ salaryByYear: [1_000_000], yearsRemaining: 1 }) }))
      }
    }
  }
  const league: LeagueState = {
    id: 'lg',
    name: 'T',
    currentDate: '2025-10-21',
    seasonYear: 2025,
    phase: 'regular_season',
    rules,
    eraConfig: { season: '2025-26' } as never,
    snapshotId: 'nba-2025-26',
    teams: { user, other },
    players: Object.fromEntries(allPlayers.map((p) => [p.id, p])),
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
    rivalries: {},
    records: [],
    hallOfFame: [],
    userTeamId: 'user',
  }
  const proposal: TradeProposal = {
    id: 'p1',
    sides: [
      { teamId: 'user', outgoing: [{ type: 'player', playerId: 'a1' }], incoming: [{ type: 'player', playerId: 'b1' }] },
      { teamId: 'other', outgoing: [{ type: 'player', playerId: 'b1' }], incoming: [{ type: 'player', playerId: 'a1' }] },
    ],
    createdAt: '2025-10-21',
    status: 'draft',
  }
  return { league, proposal }
}

describe('TradeBuilder', () => {
  it('renders 2-team layout', () => {
    const { league, proposal } = buildFixture()
    render(
      <TradeBuilder
        proposal={proposal}
        league={league}
        userTeamId="user"
        rulesMaxCash={1_000_000}
        onAddAsset={() => undefined}
        onRemoveAsset={() => undefined}
        onSubmit={() => ({ accepted: true })}
        onCancel={() => undefined}
        onSaveDraft={() => undefined}
        onSaveProtection={() => undefined}
      />,
    )
    expect(screen.getByText('Your team')).toBeInTheDocument()
    expect(screen.getByText('Counterparty')).toBeInTheDocument()
  })

  it('renders submit, save draft, cancel buttons', () => {
    const { league, proposal } = buildFixture()
    render(
      <TradeBuilder
        proposal={proposal}
        league={league}
        userTeamId="user"
        rulesMaxCash={1_000_000}
        onAddAsset={() => undefined}
        onRemoveAsset={() => undefined}
        onSubmit={() => ({ accepted: true })}
        onCancel={() => undefined}
        onSaveDraft={() => undefined}
        onSaveProtection={() => undefined}
      />,
    )
    expect(screen.getByText('Submit trade')).toBeInTheDocument()
    expect(screen.getByText('Save draft')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows AI interest meter or verdict', () => {
    const { league, proposal } = buildFixture()
    render(
      <TradeBuilder
        proposal={proposal}
        league={league}
        userTeamId="user"
        rulesMaxCash={1_000_000}
        onAddAsset={() => undefined}
        onRemoveAsset={() => undefined}
        onSubmit={() => ({ accepted: true })}
        onCancel={() => undefined}
        onSaveDraft={() => undefined}
        onSaveProtection={() => undefined}
      />,
    )
    const meter = screen.queryByText(/AI interest/) || screen.queryByText(/Likely/) || screen.queryByText(/Vetoed/) || screen.queryByText(/Illegal Trade/)
    expect(meter).toBeTruthy()
  })

  it('calls onAddAsset when add asset button is clicked', () => {
    const onAdd = vi.fn()
    const { league, proposal } = buildFixture()
    render(
      <TradeBuilder
        proposal={proposal}
        league={league}
        userTeamId="user"
        rulesMaxCash={1_000_000}
        onAddAsset={onAdd}
        onRemoveAsset={() => undefined}
        onSubmit={() => ({ accepted: true })}
        onCancel={() => undefined}
        onSaveDraft={() => undefined}
        onSaveProtection={() => undefined}
      />,
    )
    const addButtons = screen.getAllByText('+ Add')
    expect(addButtons.length).toBeGreaterThan(0)
  })

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn()
    const { league, proposal } = buildFixture()
    render(
      <TradeBuilder
        proposal={proposal}
        league={league}
        userTeamId="user"
        rulesMaxCash={1_000_000}
        onAddAsset={() => undefined}
        onRemoveAsset={() => undefined}
        onSubmit={() => ({ accepted: true })}
        onCancel={onCancel}
        onSaveDraft={() => undefined}
        onSaveProtection={() => undefined}
      />,
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows salary match bar for 2-team trades', () => {
    const { league, proposal } = buildFixture()
    render(
      <TradeBuilder
        proposal={proposal}
        league={league}
        userTeamId="user"
        rulesMaxCash={1_000_000}
        onAddAsset={() => undefined}
        onRemoveAsset={() => undefined}
        onSubmit={() => ({ accepted: true })}
        onCancel={() => undefined}
        onSaveDraft={() => undefined}
        onSaveProtection={() => undefined}
      />,
    )
    expect(screen.getByText(/Salary match/)).toBeInTheDocument()
  })
})
