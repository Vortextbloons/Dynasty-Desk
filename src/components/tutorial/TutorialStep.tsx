import type { TutorialStep as TutorialStepType } from '@/lib/tutorialEngine'

interface TutorialStepProps {
  step: TutorialStepType
  isActive: boolean
}

export function TutorialStep({ step, isActive }: TutorialStepProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${
        isActive
          ? 'border-[var(--color-primary)] bg-[var(--color-surface-2)]'
          : 'border-[var(--color-line-soft)] bg-[var(--color-surface-1)]'
      }`}
    >
      <div className="text-sm font-semibold text-[var(--color-foreground)]">{step.title}</div>
      <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{step.body}</div>
    </div>
  )
}
