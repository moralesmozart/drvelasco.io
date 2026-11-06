import { useQueryClient } from '@tanstack/react-query'
import { Archive, FileJson, LayoutTemplate, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { downloadProjectFile, readProjectFile, remapProject, type ProjectFile } from '../lib/projectFile'
import { repo } from '../lib/repo'
import { Button, Input, Label, Modal } from './ui'

export async function exportProject(pipeId: string, kind: ProjectFile['kind'], t: (k: string, o?: Record<string, unknown>) => string) {
  const id = toast.loading(t('transfer.exporting'))
  try {
    const f = await downloadProjectFile(pipeId, kind)
    toast.success(kind === 'backup' ? t('transfer.backupDone', { count: f.cards?.length ?? 0 }) : t('transfer.structureDone'), { id })
  } catch {
    toast.error(t('common.error'), { id })
  }
}

export const exportIcons = { backup: Archive, structure: LayoutTemplate }

/** "Importar projeto": pick a .json export, review, restore into a new pipe. */
export function ImportProjectButton({ existingNames }: { existingNames: string[] }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<ProjectFile | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()

  async function pick(f: File) {
    try {
      const data = await readProjectFile(f)
      setFile(data)
      setName(existingNames.includes(data.pipe.name) ? `${data.pipe.name} (${t('transfer.copy')})` : data.pipe.name)
    } catch {
      toast.error(t('transfer.invalid'))
    }
  }

  async function restore() {
    if (!file) return
    setBusy(true)
    try {
      const id = await repo.restoreProject(remapProject(file, name.trim() || file.pipe.name))
      await qc.invalidateQueries({ queryKey: ['pipes'] })
      toast.success(t('transfer.restored'))
      setFile(null)
      navigate(`/pipe/${id}`)
    } catch {
      toast.error(t('transfer.restoreFailed'))
    } finally { setBusy(false) }
  }

  const stat = (n: number, k: string) => (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-xl font-bold tabular-nums text-slate-900">{n}</p>
      <p className="text-xs text-slate-500">{t(k)}</p>
    </div>
  )

  return (
    <>
      <Button variant="secondary" onClick={() => ref.current?.click()}><Upload className="h-4 w-4" /> {t('transfer.import')}</Button>
      <input ref={ref} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = '' }} />
      <Modal
        open={!!file}
        onClose={() => setFile(null)}
        title={t('transfer.importTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFile(null)}>{t('common.cancel')}</Button>
            <Button loading={busy} onClick={restore} disabled={!name.trim()}>{t('transfer.restore')}</Button>
          </>
        }
      >
        {file && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700"><FileJson className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{file.pipe.name}</p>
                <p className="text-xs text-slate-500">
                  {file.kind === 'backup' ? t('transfer.kindBackup') : t('transfer.kindStructure')} · {new Date(file.exported_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stat(file.phases.length, 'transfer.phases')}
              {stat(file.fields.length, 'transfer.fields')}
              {stat(file.templates?.length ?? 0, 'transfer.templates')}
              {stat(file.cards?.length ?? 0, 'transfer.cards')}
            </div>
            <div>
              <Label htmlFor="restore-name">{t('home.pipeName')}</Label>
              <Input id="restore-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">{t('transfer.newPipeNote')}</p>
          </div>
        )}
      </Modal>
    </>
  )
}
