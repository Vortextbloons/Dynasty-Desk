import { create } from 'zustand'

interface UiStore {
  tutorial: {
    currentStep: number | null
    completedSteps: string[]
    dismissed: boolean
  }
  startTutorial: () => void
  nextTutorialStep: () => void
  completeTutorial: () => void
  dismissTutorial: () => void
  resetTutorial: () => void
}

const TUTORIAL_STORAGE_KEY = 'dd-tutorial-state'

function loadTutorialState() {
  try {
    const raw = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { completedSteps: [], dismissed: false }
}

export const useUiStore = create<UiStore>((set, get) => ({
  tutorial: {
    currentStep: null,
    ...loadTutorialState(),
  },
  startTutorial: () => set({ tutorial: { ...get().tutorial, currentStep: 0 } }),
  nextTutorialStep: () => {
    const t = get().tutorial
    if (t.currentStep === null) return
    set({ tutorial: { ...t, currentStep: t.currentStep + 1 } })
  },
  completeTutorial: () => {
    const t = get().tutorial
    const state = { ...t, currentStep: null, dismissed: true, completedSteps: ['all'] }
    localStorage.setItem(
      TUTORIAL_STORAGE_KEY,
      JSON.stringify({ completedSteps: state.completedSteps, dismissed: state.dismissed }),
    )
    set({ tutorial: state })
  },
  dismissTutorial: () => {
    const state = { ...get().tutorial, currentStep: null, dismissed: true }
    localStorage.setItem(
      TUTORIAL_STORAGE_KEY,
      JSON.stringify({ completedSteps: state.completedSteps, dismissed: state.dismissed }),
    )
    set({ tutorial: state })
  },
  resetTutorial: () => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
    set({ tutorial: { currentStep: null, completedSteps: [], dismissed: false } })
  },
}))
