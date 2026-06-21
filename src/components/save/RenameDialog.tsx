import { useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface RenameDialogProps {
  open: boolean
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
}

export function RenameDialog({
  open,
  currentName,
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [value, setValue] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevOpenRef = useRef(open)

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setValue(currentName)
      setTimeout(() => inputRef.current?.select(), 0)
    }
    prevOpenRef.current = open
  }, [open, currentName])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed && trimmed !== currentName) {
      onConfirm(trimmed)
    } else {
      onCancel()
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[51] grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-6 text-[var(--color-foreground)] shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
            Rename save
          </DialogPrimitive.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              placeholder="Save name"
              maxLength={64}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">Rename</Button>
            </div>
          </form>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100" type="button">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
