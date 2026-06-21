import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const HELP_TEXT: Record<string, string> = {
  dashboard: 'Overview of your team record, standings position, and upcoming games.',
  roster: 'View all players on your team with ratings, contract details, and development status.',
  lineup: 'Set your starting five, bench rotation, and closing lineup. Drag players to reorder.',
  schedule: 'See your full season schedule. Click a game to sim or view box score.',
  standings: 'Conference and division standings with win/loss records and streaks.',
  playoffs: 'Track playoff bracket and series results through the postseason.',
  trades: 'Propose trades with other GMs. Offers are evaluated based on player value and team needs.',
  draft: 'Scout prospects and make selections during the annual draft.',
  freeAgency: 'Sign available free agents. Watch the market shift as players find new homes.',
  settings: 'Adjust simulation settings, game preferences, and league options.',
}

interface HelpButtonProps {
  page: string
}

export function HelpButton({ page }: HelpButtonProps) {
  const text = HELP_TEXT[page] ?? 'No help available for this page.'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          aria-label={`Help for ${page}`}
        >
          <HelpCircle className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
