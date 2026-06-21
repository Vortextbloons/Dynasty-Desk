import { useEffect, useState } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

export function SaveIndicator() {
  const saveStatus = useGameStore((s) => s.saveStatus)
  const [autoHidden, setAutoHidden] = useState(false)

  useEffect(() => {
    if (saveStatus !== 'ready') {
      return () => { setAutoHidden(false) }
    }
    const t = setTimeout(() => setAutoHidden(true), 2000)
    return () => { clearTimeout(t); setAutoHidden(false) }
  }, [saveStatus])

  const visible = !autoHidden && (saveStatus === 'saving' || saveStatus === 'error' || saveStatus === 'ready')

  if (!visible) return null

  if (saveStatus === 'saving') {
    return <Loader2 className="size-3.5 animate-spin text-[var(--color-primary)]" />
  }

  if (saveStatus === 'ready') {
    return <Check className="size-3.5 text-[var(--color-positive)]" />
  }

  if (saveStatus === 'error') {
    return <AlertCircle className="size-3.5 text-[var(--color-negative)]" />
  }

  return null
}
