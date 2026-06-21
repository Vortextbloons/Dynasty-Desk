import { useEffect, useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { useUiStore } from '@/store/useUiStore'
import { FIRST_RUN_TUTORIAL } from '@/lib/tutorialEngine'
import { Button } from '@/components/ui/button'
import { useLocation } from 'react-router-dom'

function getRect(sel: string): DOMRect | null {
  const el = document.querySelector(sel)
  if (!el) return null
  return el.getBoundingClientRect()
}

function tooltipOffset(pos: 'top' | 'bottom' | 'left' | 'right', rect: DOMRect) {
  const gap = 12
  switch (pos) {
    case 'top':
      return { x: rect.left + rect.width / 2, y: rect.top - gap }
    case 'bottom':
      return { x: rect.left + rect.width / 2, y: rect.bottom + gap }
    case 'left':
      return { x: rect.left - gap, y: rect.top + rect.height / 2 }
    case 'right':
      return { x: rect.right + gap, y: rect.top + rect.height / 2 }
  }
}

export function TutorialOverlay() {
  const tutorial = useUiStore((s) => s.tutorial)
  const startTutorial = useUiStore((s) => s.startTutorial)
  const nextTutorialStep = useUiStore((s) => s.nextTutorialStep)
  const dismissTutorial = useUiStore((s) => s.dismissTutorial)
  const completeTutorial = useUiStore((s) => s.completeTutorial)

  const location = useLocation()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const step =
    tutorial.currentStep !== null ? FIRST_RUN_TUTORIAL[tutorial.currentStep] : undefined

  useEffect(() => {
    if (!step) {
      setTargetRect(null)
      return
    }

    let raf: number
    let retries = 0
    function poll() {
      const rect = getRect(step!.targetSelector)
      if (rect) {
        setTargetRect(rect)
      } else if (retries < 30) {
        retries++
        raf = requestAnimationFrame(poll)
      }
    }
    poll()
    return () => cancelAnimationFrame(raf)
  }, [step])

  useEffect(() => {
    if (!step) return
    if (step.nextTrigger !== 'route_change') return
    if (!targetRect) return
    nextTutorialStep()
  }, [location.pathname, step, targetRect, nextTutorialStep])

  useEffect(() => {
    const hasSeen = localStorage.getItem('dd-tutorial-state')
    if (!hasSeen) {
      startTutorial()
    }
  }, [startTutorial])

  if (!step || !targetRect) return null

  const offset = tooltipOffset(step.position, targetRect)
  const isLast = tutorial.currentStep === FIRST_RUN_TUTORIAL.length - 1
  const stepCount = FIRST_RUN_TUTORIAL.length

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={dismissTutorial} />

      <div
        className="absolute rounded-lg ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-black/60"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />

      <div
        className="absolute z-10 w-72 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-4 shadow-xl"
        style={{
          top: offset.y,
          left: offset.x,
          transform:
            step.position === 'top'
              ? 'translate(-50%, -100%)'
              : step.position === 'bottom'
                ? 'translate(-50%, 0)'
                : step.position === 'left'
                  ? 'translate(-100%, -50%)'
                  : 'translate(0, -50%)',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--color-foreground)]">{step.title}</div>
          <button onClick={dismissTutorial} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {tutorial.currentStep! + 1} / {stepCount}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={dismissTutorial}>
              Skip
            </Button>
            <Button size="sm" onClick={isLast ? completeTutorial : nextTutorialStep}>
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="size-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
