import { simulateGame, type SimulateGameInput, type SimulateGameOutput } from '@/game/sim/gameSimulator'

interface SimulateMessage {
  type: 'simulate'
  input: SimulateGameInput
}

interface SimulateBatchMessage {
  type: 'simulateBatch'
  inputs: SimulateGameInput[]
}

interface CancelMessage {
  type: 'cancel'
}

type WorkerMessage = SimulateMessage | SimulateBatchMessage | CancelMessage

let cancelled = false

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data

  if (msg.type === 'cancel') {
    cancelled = true
    return
  }

  if (msg.type === 'simulate') {
    cancelled = false
    const result = await simulateGame(msg.input)
    self.postMessage({ type: 'result', payload: result })
    return
  }

  if (msg.type === 'simulateBatch') {
    cancelled = false
    const results: SimulateGameOutput[] = []

    for (let i = 0; i < msg.inputs.length; i++) {
      if (cancelled) {
        self.postMessage({ type: 'cancelled', processed: i })
        return
      }

      const result = await simulateGame(msg.inputs[i]!)
      results.push(result)

      self.postMessage({
        type: 'progress',
        current: i + 1,
        total: msg.inputs.length,
      })
    }

    self.postMessage({ type: 'batchResult', payload: results })
  }
}
