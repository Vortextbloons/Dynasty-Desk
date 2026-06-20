import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Copy,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppShell } from '@/components/layout/AppShell'
import { useGameStore } from '@/store/useGameStore'
import type { SaveMetadata } from '@/game/models'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function LoadGamePage() {
  const navigate = useNavigate()
  const saves = useGameStore((s) => s.saves)
  const loadSavesList = useGameStore((s) => s.loadSavesList)
  const loadSaveFromDb = useGameStore((s) => s.loadSaveFromDb)
  const deleteSave = useGameStore((s) => s.deleteSave)
  const duplicateSave = useGameStore((s) => s.duplicateSave)
  const importSaveFromFile = useGameStore((s) => s.importSaveFromFile)
  const exportSave = useGameStore((s) => s.exportSave)

  const [importing, setImporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadSavesList()
  }, [loadSavesList])

  async function handleLoad(id: string) {
    try {
      await loadSaveFromDb(id)
      void navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load save.'
      toast.error(msg)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteSave(id)
      toast.success('Save deleted.')
    } catch {
      toast.error('Failed to delete save.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDuplicate(id: string, name: string) {
    setDuplicatingId(id)
    try {
      await duplicateSave(id, `${name} (Copy)`)
      toast.success('Save duplicated.')
    } catch {
      toast.error('Failed to duplicate save.')
    } finally {
      setDuplicatingId(null)
    }
  }

  async function handleExport(id: string) {
    try {
      await exportSave(id)
      toast.success('Save exported.')
    } catch {
      toast.error('Failed to export save.')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      await importSaveFromFile(file)
      toast.success('Save imported successfully.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      toast.error(msg)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Continue your run"
        title="Load Game"
        description="Pick up a saved league, or import a save file from another device."
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}{' '}
              Import save
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="size-4" /> Home
              </Link>
            </Button>
          </div>
        }
      />

      {saves.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto size-12 rounded-full bg-[var(--color-surface-3)] text-[var(--color-primary)] grid place-items-center">
              <FolderOpen className="size-5" />
            </div>
            <div className="mt-4 font-display text-2xl">No saves yet</div>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">
              Start a new league to create your first save. Saves are stored
              locally in your browser.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link to="/new-league">Start a new league</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {saves.map((s) => (
            <SaveRow
              key={s.id}
              save={s}
              onLoad={handleLoad}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onExport={handleExport}
              deletingId={deletingId}
              duplicatingId={duplicatingId}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}

function SaveRow({
  save,
  onLoad,
  onDelete,
  onDuplicate,
  onExport,
  deletingId,
  duplicatingId,
}: {
  save: SaveMetadata
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string, name: string) => void
  onExport: (id: string) => void
  deletingId: string | null
  duplicatingId: string | null
}) {
  const date = new Date(save.updatedAt)
  const timeAgo = formatTimeAgo(date)

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-display text-base truncate">{save.name}</div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            {save.teamName} · {save.snapshotId} · {save.currentSeason}
          </div>
          <div className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
            Last played {timeAgo}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={() => onLoad(save.id)}>
            Load
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onExport(save.id)}
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={duplicatingId === save.id}
            onClick={() => onDuplicate(save.id, save.name)}
          >
            {duplicatingId === save.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={deletingId === save.id}
                aria-label={`Delete ${save.name}`}
              >
                {deletingId === save.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
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
                <AlertDialogAction onClick={() => onDelete(save.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
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
