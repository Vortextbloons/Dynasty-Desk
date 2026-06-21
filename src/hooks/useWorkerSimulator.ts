import { useRef, useCallback, useEffect } from 'react'
import type { SimulateGameInput, SimulateGameOutput } from '@/game/sim/gameSimulator'

interface WorkerProgress {
  current: number
  total: number
}

interface WorkerResultMessage {
  type: 'result'
  payload: SimulateGameOutput
}

interface WorkerProgressMessage {
  type: 'progress'
  current: number
  total: number
}

interface WorkerBatchResultMessage {
  type: 'batchResult'
  payload: SimulateGameOutput[]
}

interface WorkerCancelledMessage {
  type: 'cancelled'
}

type WorkerMessage = WorkerResultMessage | WorkerProgressMessage | WorkerBatchResultMessage | WorkerCancelledMessage

export function useWorkerSimulator() {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const getWorker = useCallback(() => {
    workerRef.current ??= new Worker(
      new URL('@/workers/simWorker.ts', import.meta.url),
      { type: 'module' },
    )
    return workerRef.current
  }, [])

  const simulateGame = useCallback(
    (input: SimulateGameInput): Promise<SimulateGameOutput> => {
      return new Promise((resolve) => {
        const worker = getWorker()
        const handler = (e: MessageEvent<WorkerMessage>) => {
          if (e.data.type === 'result') {
            worker.removeEventListener('message', handler)
            resolve(e.data.payload)
          }
        }
        worker.addEventListener('message', handler)
        worker.postMessage({ type: 'simulate', input })
      })
    },
    [getWorker],
  )

  const simulateBatch = useCallback(
    (
      inputs: SimulateGameInput[],
      onProgress?: (progress: WorkerProgress) => void,
    ): Promise<SimulateGameOutput[]> => {
      return new Promise((resolve, reject) => {
        const worker = getWorker()
        const handler = (e: MessageEvent<WorkerMessage>) => {
          if (e.data.type === 'progress') {
            onProgress?.({ current: e.data.current, total: e.data.total })
          } else if (e.data.type === 'batchResult') {
            worker.removeEventListener('message', handler)
            resolve(e.data.payload)
          } else if (e.data.type === 'cancelled') {
            worker.removeEventListener('message', handler)
            reject(new Error('cancelled'))
          }
        }
        worker.addEventListener('message', handler)
        worker.postMessage({ type: 'simulateBatch', inputs })
      })
    },
    [getWorker],
  )

  const cancel = useCallback(() => {
    workerRef.current?.postMessage({ type: 'cancel' })
  }, [])

  return { simulateGame, simulateBatch, cancel }
}
