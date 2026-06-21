import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FolderOpen,
  Upload,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppShell } from '@/components/layout/AppShell'
import { useGameStore } from '@/store/useGameStore'
import { SaveCard } from '@/components/save/SaveCard'
import { toast } from 'sonner'

export function LoadGamePage() {
  const navigate = useNavigate()
  const saves = useGameStore((s) => s.saves)
  const save = useGameStore((s) => s.save)
  const loadSavesList = useGameStore((s) => s.loadSavesList)
  const loadSaveFromDb = useGameStore((s) => s.loadSaveFromDb)
  const deleteSave = useGameStore((s) => s.deleteSave)
  const duplicateSave = useGameStore((s) => s.duplicateSave)
  const importSaveFromFile = useGameStore((s) => s.importSaveFromFile)
  const exportSave = useGameStore((s) => s.exportSave)
  const renameSave = useGameStore((s) => s.renameSave)
  const restoreBackup = useGameStore((s) => s.restoreBackup)

  const [importing, setImporting] = useState(false)
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
    try {
      await deleteSave(id)
      toast.success('Save deleted.')
    } catch {
      toast.error('Failed to delete save.')
    }
  }

  async function handleDuplicate(id: string, name: string) {
    try {
      await duplicateSave(id, `${name} (Copy)`)
      toast.success('Save duplicated.')
    } catch {
      toast.error('Failed to duplicate save.')
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

  async function handleRename(id: string, newName: string) {
    try {
      await renameSave(id, newName)
      toast.success('Save renamed.')
    } catch {
      toast.error('Failed to rename save.')
    }
  }

  async function handleRestoreBackup(id: string) {
    try {
      await restoreBackup(id)
      toast.success('Backup restored.')
    } catch {
      toast.error('Failed to restore backup.')
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
            <Button asChild>
              <Link to="/new-league">New League</Link>
            </Button>
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
        <div className="grid gap-3 sm:grid-cols-2">
          {saves.map((s) => (
            <SaveCard
              key={s.id}
              save={s}
              isActive={save?.metadata.id === s.id}
              onLoad={() => handleLoad(s.id)}
              onDelete={() => handleDelete(s.id)}
              onDuplicate={() => handleDuplicate(s.id, s.name)}
              onExport={() => handleExport(s.id)}
              onRename={(name) => handleRename(s.id, name)}
              onRestoreBackup={
                s.backupCreatedAt
                  ? () => handleRestoreBackup(s.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
