import { useState } from 'react'
import {
  Download,
  Copy,
  Trash2,
  RotateCcw,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { SaveMetadata } from '@/game/models'
import { RenameDialog } from './RenameDialog'

interface SaveCardProps {
  save: SaveMetadata
  isActive: boolean
  onLoad: () => void
  onDelete: () => void
  onDuplicate: () => void
  onExport: () => void
  onRename: (newName: string) => void
  onRestoreBackup?: () => void
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

export function SaveCard({
  save,
  isActive,
  onLoad,
  onDelete,
  onDuplicate,
  onExport,
  onRename,
  onRestoreBackup,
}: SaveCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)

  const date = new Date(save.updatedAt)
  const timeAgo = formatTimeAgo(date)

  return (
    <Card
      className={`transition-colors ${
        isActive
          ? 'border-[var(--color-primary)] shadow-[0_0_0_1px_var(--color-primary)]'
          : 'border-[var(--color-line-soft)]'
      }`}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            className="font-display text-base truncate text-left hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            title="Click to rename"
          >
            {save.name}
          </button>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            {save.teamName} · {save.snapshotId} · {save.currentSeason}
          </div>
          {save.notes ? (
            <div className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5 truncate">
              {save.notes}
            </div>
          ) : null}
          <div className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
            Last played {timeAgo}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={onLoad}>
            Load
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRenameOpen(true)}
            aria-label={`Rename ${save.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onExport}
            aria-label={`Export ${save.name}`}
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDuplicate}
            aria-label={`Duplicate ${save.name}`}
          >
            <Copy className="size-3.5" />
          </Button>
          {onRestoreBackup && save.backupCreatedAt ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRestoreBackup}
              aria-label={`Restore backup for ${save.name}`}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          ) : null}
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${save.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete save?</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete &quot;{save.name}&quot;? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete()
                    setConfirmOpen(false)
                  }}
                >
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
      <RenameDialog
        open={renameOpen}
        currentName={save.name}
        onConfirm={(name) => {
          setRenameOpen(false)
          onRename(name)
        }}
        onCancel={() => setRenameOpen(false)}
      />
    </Card>
  )
}
