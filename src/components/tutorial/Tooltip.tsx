import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface StatTooltipProps {
  content: string
  children: React.ReactNode
}

export function StatTooltip({ content, children }: StatTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-[var(--color-popover-foreground)] bg-[var(--color-popover)] border-[var(--color-line-soft)]">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
