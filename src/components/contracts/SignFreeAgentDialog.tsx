import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Player } from '@/game/models/player'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { ExceptionType } from '@/game/management/contractActions'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface SignFreeAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: Player | null
  rules: LeagueRules
  canUseMLE: boolean
  canUseBAE: boolean
  canUseRoomMle: boolean
  onConfirm: (playerId: string, offer: { years: number; salaryByYear: number[] }, exception: ExceptionType) => void
}

export function SignFreeAgentDialog({
  open,
  onOpenChange,
  player,
  rules,
  canUseMLE,
  canUseBAE,
  canUseRoomMle,
  onConfirm,
}: SignFreeAgentDialogProps) {
  const [years, setYears] = useState('1')
  const [salary, setSalary] = useState('')
  const [exception, setException] = useState<ExceptionType>('minimum')

  if (!player) return null

  function handleConfirm() {
    if (!player) return
    const y = Number(years) || 1
    const s = Number(salary) || 0
    const salaryByYear = Array.from({ length: y }, () => s)
    onConfirm(player.id, { years: y, salaryByYear }, exception)
  }

  const availableExceptions: { value: ExceptionType; label: string; available: boolean; max: number }[] = [
    { value: 'minimum', label: 'Vet Min', available: true, max: rules.minimumPlayerSalary * 2 },
    { value: 'mle', label: 'MLE', available: canUseMLE, max: rules.midLevelException },
    { value: 'bae', label: 'BAE', available: canUseBAE, max: rules.biAnnualException },
    { value: 'room_mle', label: 'Room MLE', available: canUseRoomMle, max: rules.roomMle },
  ]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Sign {player.firstName} {player.lastName}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {player.position} · Age {player.age} · Free Agent
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Exception</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {availableExceptions.map((ex) => (
                <button
                  key={ex.value}
                  disabled={!ex.available}
                  onClick={() => setException(ex.value)}
                  className={`rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                    exception === ex.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : ex.available
                        ? 'border-[var(--color-line-soft)] hover:bg-[var(--color-surface-2)]'
                        : 'border-[var(--color-line-soft)] opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium">{ex.label}</div>
                  <div className="text-[10px] text-[var(--color-muted-foreground)]">
                    {ex.available ? `Max ${fmt(ex.max)}` : 'Used'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Years</label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                min={1}
                max={rules.maxContractYears}
                className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Salary / Year</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. 5000000"
                className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm}>Sign Player</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
