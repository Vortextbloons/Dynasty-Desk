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
import { computeCapHit } from '@/game/management/capEngine'

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface ContractActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: Player | null
  action: 'cut' | 'stretch' | 'buyout' | 'extend' | null
  rules: LeagueRules
  onConfirm: (playerId: string, amount?: number) => void
}

function computeGuaranteedRemaining(contract: Player['contract']): number {
  let total = 0
  for (let i = 0; i < contract.yearsRemaining; i++) {
    if (contract.guaranteedByYear[i] ?? contract.guaranteed) {
      total += contract.salaryByYear[i] ?? 0
    }
  }
  return total
}

export function ContractActionDialog({
  open,
  onOpenChange,
  player,
  action,
  rules,
  onConfirm,
}: ContractActionDialogProps) {
  const [settleAmount, setSettleAmount] = useState('')
  const [extensionYears, setExtensionYears] = useState('2')
  const [extensionSalary, setExtensionSalary] = useState('')

  if (!player || !action) return null

  const guaranteed = computeGuaranteedRemaining(player.contract)
  const capHit = computeCapHit(player, rules)

  function handleConfirm() {
    if (!player) return
    if (action === 'buyout') {
      onConfirm(player.id, Number(settleAmount) || 0)
    } else if (action === 'extend') {
      const years = Number(extensionYears) || 2
      const salary = Number(extensionSalary) || 0
      onConfirm(player.id, years * salary)
    } else {
      onConfirm(player.id)
    }
  }

  const titles: Record<string, string> = {
    cut: `Cut ${player.firstName} ${player.lastName}`,
    stretch: `Stretch ${player.firstName} ${player.lastName}`,
    buyout: `Buyout ${player.firstName} ${player.lastName}`,
    extend: `Extend ${player.firstName} ${player.lastName}`,
  }

  const descriptions: Record<string, string> = {
    cut: `Waiving this player will free ${fmt(capHit - guaranteed)} in cap space. ${fmt(guaranteed)} in guaranteed money becomes dead money.`,
    stretch: `Stretching waives the player and spreads ${fmt(guaranteed)} in guaranteed money over ${player.contract.yearsRemaining * 2} years (${fmt(guaranteed / (player.contract.yearsRemaining * 2))}/yr).`,
    buyout: `Negotiate a buyout. Remaining guaranteed: ${fmt(guaranteed)}. Any settlement below that reduces the cap hit by half the difference.`,
    extend: `Offer a new contract. Current cap hit: ${fmt(capHit)}. Bird rights: ${player.contract.birdRights ? 'Yes' : 'No'}.`,
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titles[action]}</AlertDialogTitle>
          <AlertDialogDescription>{descriptions[action]}</AlertDialogDescription>
        </AlertDialogHeader>

        {action === 'buyout' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Settlement Amount</label>
            <input
              type="number"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              placeholder={`0 - ${fmt(guaranteed)}`}
              className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Must be between $0 and {fmt(guaranteed)}
            </div>
          </div>
        )}

        {action === 'extend' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Years</label>
                <input
                  type="number"
                  value={extensionYears}
                  onChange={(e) => setExtensionYears(e.target.value)}
                  min={1}
                  max={rules.maxContractYears}
                  className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Avg Salary</label>
                <input
                  type="number"
                  value={extensionSalary}
                  onChange={(e) => setExtensionSalary(e.target.value)}
                  placeholder="e.g. 25000000"
                  className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            <div className="text-[10px] text-[var(--color-muted-foreground)]">
              Max {rules.maxContractYears} years. Max {8}% annual raise.
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm}>
            {action === 'cut' && 'Waive Player'}
            {action === 'stretch' && 'Stretch & Waive'}
            {action === 'buyout' && 'Complete Buyout'}
            {action === 'extend' && 'Offer Extension'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
