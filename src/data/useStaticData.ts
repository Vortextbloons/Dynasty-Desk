import { useEffect, useState } from 'react'
import {
  createStaticDataLoader,
  type StaticDataLoader,
} from '@/data/loadStaticData'
import type { DataManifest, StaticSnapshot } from '@/game/models'

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; manifest: DataManifest; loader: StaticDataLoader }

export function useStaticData(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const loader = createStaticDataLoader()
    loader
      .loadManifest()
      .then((manifest) => {
        if (cancelled) return
        setState({ status: 'ready', manifest, loader })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setState({ status: 'error', error: message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export function useSnapshot(
  loader: StaticDataLoader | null,
  id: string | null,
) {
  const [snapshot, setSnapshot] = useState<StaticSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loader || !id) {
      queueMicrotask(() => setSnapshot(null))
      return
    }
    let cancelled = false
    queueMicrotask(() => setError(null))
    loader
      .loadSnapshot(id)
      .then((snap) => {
        if (cancelled) return
        setSnapshot(snap)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      })
    return () => {
      cancelled = true
    }
  }, [loader, id])

  return { snapshot, error }
}
