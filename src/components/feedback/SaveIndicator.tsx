import { useEffect, useState } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

export function SaveIndicator() {
  const saveStatus = useGameStore((s) => s.saveStatus)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (saveStatus === 'saving') {
      setVisible(true)
      return
    }
    if (saveStatus === 'ready') {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(t)
    }
    if (saveStatus === 'error') {
      setVisible(true)
      return
    }
    setVisible(false)
  }, [saveStatus])

  if (!visible) return null

  if (saveStatus === 'saving') {
    return (
      <Loader2 className="size-3.5 animate-spin text-[var(--color-primary)]" />
    )
  }

  if (saveStatus === 'ready') {
    return (
      <Check className="size-3.5 text-[var(--color-positive)]" />
    )
  }

  if (saveStatus === 'error') {
    return (
      <AlertCircle className="size-3.5 text-[var(--color-negative)]" />
    )
  }

  return null
}
