import type { LeagueState } from '@/game/models/league'
import type { Draft } from '@/game/models/draft'
import {
  formatTeamDisplayName,
  getDraftOrderBoard,
} from '@/game/league/draftEngine'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { ListOrdered } from 'lucide-react'

interface DraftOrderPanelProps {
  league: LeagueState
  draft: Draft
  userTeamId: string
  currentPickNumber: number
}

export function DraftOrderPanel({
  league,
  draft,
  userTeamId,
  currentPickNumber,
}: DraftOrderPanelProps) {
  const board = getDraftOrderBoard(league, draft)

  if (board.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-4">
      <SectionLabel className="mb-3 flex items-center gap-2">
        <ListOrdered className="size-4" /> Draft order
      </SectionLabel>
      <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
        {board.map((entry) => {
          const owner = league.teams[entry.currentTeamId]
          const original = league.teams[entry.originalTeamId]
          const isOnClock = entry.pickNumber === currentPickNumber
          const isUser = entry.currentTeamId === userTeamId

          return (
            <div
              key={`${entry.pickNumber}-${entry.round}`}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${
                isOnClock
                  ? 'bg-[var(--color-primary)]/15 ring-1 ring-[var(--color-primary)]/30'
                  : ''
              }`}
            >
              <div className="min-w-0">
                <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                  #{entry.pickNumber}
                </span>{' '}
                <span className={isUser ? 'font-medium text-[var(--color-primary)]' : ''}>
                  {owner?.abbreviation ?? entry.currentTeamId}
                </span>
                {entry.traded && original && (
                  <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">
                    (via {original.abbreviation})
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                R{entry.round}
                {isOnClock ? ' · ON CLOCK' : ''}
              </span>
            </div>
          )
        })}
      </div>
      {draft.orderSource === 'lottery' && (
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          Lottery winner:{' '}
          {formatTeamDisplayName(
            league,
            draft.lotteryResults?.find((o) => o.pickNumber === 1)?.teamId,
          )}
        </p>
      )}
    </div>
  )
}
