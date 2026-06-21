import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getActiveSaveId } from '@/game/core/activeSavePersistence'
import { useGameStore } from '@/store/useGameStore'

interface ActiveSaveBootstrapProps {
  children: ReactNode
}

export function ActiveSaveBootstrap({ children }: ActiveSaveBootstrapProps) {
  const restoreActiveSave = useGameStore((s) => s.restoreActiveSave)
  const needsRestore = useRef(getActiveSaveId()).current
  const [ready, setReady] = useState(!needsRestore)

  useEffect(() => {
    void restoreActiveSave().finally(() => setReady(true))
  }, [restoreActiveSave])

  if (!ready) {
    if (!needsRestore) return null

    return (
      <div className="fixed inset-0 grid place-items-center bg-[var(--color-background)]">
        <Loader2 className="size-8 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  return <>{children}</>
}
