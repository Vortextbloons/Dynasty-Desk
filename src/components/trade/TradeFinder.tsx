import { useState, useMemo } from 'react'
import type { LeagueState } from '@/game/models/league'
import type { TradeProposal } from '@/game/models/trade'
import { findTrades as findTradesEngine } from '@/game/management/tradeFinder'
import { Card, CardContent } from '@/components/ui/card'

interface TradeFinderProps {
  league: LeagueState
  onSelect: (proposal: TradeProposal) => void
}

export function TradeFinder({ league, onSelect }: TradeFinderProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TradeProposal[]>([])
  const [searched, setSearched] = useState(false)

  const allPlayers = useMemo(() => Object.values(league.players), [league.players])
  const matches = useMemo(() => {
    if (!query) return []
    const q = query.toLowerCase()
    return allPlayers
      .filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q),
      )
      .slice(0, 5)
  }, [query, allPlayers])

  function handleSearch(playerId: string) {
    setSearched(true)
    const userTeam = league.teams[league.userTeamId]
    if (!userTeam) return
    const proposals = findTradesEngine(userTeam, playerId, league, {
      maxResults: 5,
      capFlexibility: 'loose',
    })
    setResults(proposals)
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] mb-1">
            Trade finder
          </div>
          <input
            type="text"
            placeholder="Search any NBA player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
          />
        </div>

        {query && matches.length > 0 && (
          <div className="space-y-1">
            {matches.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSearch(player.id)}
                className="w-full text-left text-xs rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-1.5 hover:border-[var(--color-primary)]/40"
              >
                Search trades for {player.firstName} {player.lastName} ({player.position}, OVR {player.ratings.overall})
              </button>
            ))}
          </div>
        )}

        {searched && results.length === 0 && (
          <div className="text-xs text-[var(--color-muted-foreground)] italic">
            No legal proposals found.
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Top proposals (closest to value match)
            </div>
            {results.map((proposal) => {
              const userSide = proposal.sides.find(
                (s) => s.teamId === league.userTeamId,
              )
              const otherSide = proposal.sides.find(
                (s) => s.teamId !== league.userTeamId,
              )
              if (!userSide || !otherSide) return null
              return (
                <button
                  key={proposal.id}
                  onClick={() => onSelect(proposal)}
                  className="w-full text-left rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 hover:border-[var(--color-primary)]/40"
                >
                  <div className="text-xs">
                    <span className="font-display">Trade idea:</span>{' '}
                    You send {userSide.outgoing.length} asset(s) →{' '}
                    {league.teams[otherSide.teamId]?.name ?? 'team'} sends{' '}
                    {otherSide.outgoing.length} asset(s)
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
