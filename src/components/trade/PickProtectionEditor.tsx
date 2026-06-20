import { useState } from 'react'
import { PickProtectionBadge } from './PickProtectionBadge'

interface PickProtectionEditorProps {
  pickId: string
  protection?: string
  stepienBlocked?: boolean
  frozenUntilSeason?: string
  canEdit: boolean
  onSave: (pickId: string, protection: string | null) => void
}

export function PickProtectionEditor({
  pickId,
  protection,
  stepienBlocked,
  frozenUntilSeason,
  canEdit,
  onSave,
}: PickProtectionEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(protection ?? '')

  if (!canEdit) {
    return (
      <PickProtectionBadge
        protection={protection}
        stepienBlocked={stepienBlocked}
        frozenUntilSeason={frozenUntilSeason}
      />
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={value}
          placeholder="e.g. 1-10"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSave(pickId, value.trim() === '' ? null : value)
              setEditing(false)
            } else if (e.key === 'Escape') {
              setValue(protection ?? '')
              setEditing(false)
            }
          }}
          className="w-20 rounded border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-1 py-0.5 text-[10px] font-mono"
        />
        <button
          onClick={() => {
            onSave(pickId, value.trim() === '' ? null : value)
            setEditing(false)
          }}
          className="text-[10px] text-emerald-500 hover:underline"
        >
          ✓
        </button>
        <button
          onClick={() => {
            setValue(protection ?? '')
            setEditing(false)
          }}
          className="text-[10px] text-[var(--color-muted-foreground)] hover:underline"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setValue(protection ?? '')
        setEditing(true)
      }}
      className="hover:opacity-80"
      title="Click to edit protection"
    >
      <PickProtectionBadge
        protection={protection}
        stepienBlocked={stepienBlocked}
        frozenUntilSeason={frozenUntilSeason}
      />
    </button>
  )
}
