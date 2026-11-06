import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Header, PipeIcon } from '../components/Layout'
import { exportIcons, exportProject, ImportProjectButton } from '../components/ProjectTransfer'
import { HomeSummary } from '../components/HomeSummary'
import { Button, ColorPicker, ConfirmDialog, IconButton, Input, Label, Menu, Modal, Spinner } from '../components/ui'
import { PIPE_ICONS } from '../lib/defaults'
import { repo } from '../lib/repo'
import type { PipeSummary } from '../lib/types'

export default function Home() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data: pipes, isLoading } = useQuery({ queryKey: ['pipes'], queryFn: () => repo.listPipes() })
  const [editing, setEditing] = useState<PipeSummary | 'new' | null>(null)
  const [deleting, setDeleting] = useState<PipeSummary | null>(null)

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {pipes && pipes.length > 0 && <div className="mb-10"><HomeSummary pipes={pipes} /></div>}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t('home.subtitle')}</h2>
          </div>
          <ImportProjectButton existingNames={(pipes ?? []).map((p) => p.name)} />
        </div>

        {isLoading ? (
          <div className="mt-10 grid place-items-center"><Spinner /></div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => setEditing('new')}
              className="group flex min-h-36 flex-col items-start justify-between rounded-2xl border-2 border-dashed border-slate-300 p-5 text-left transition hover:border-brand-400 hover:bg-brand-50/50"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-brand-100 group-hover:text-brand-700">
                <Plus className="h-5 w-5" />
              </span>
              <span className="font-medium text-brand-700">{t('home.newPipe')}</span>
            </button>

            {pipes?.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative"
              >
                <Link
                  to={`/pipe/${p.id}`}
                  className="flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
                  style={{ backgroundImage: `linear-gradient(135deg, ${p.color}14, transparent 60%)` }}
                >
                  <PipeIcon name={p.icon} color={p.color} />
                  <div>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="mt-0.5 text-sm text-slate-500">{t('home.cards', { count: p.card_count })}</div>
                  </div>
                </Link>
                <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <Menu
                    trigger={(open) => (
                      <IconButton label="Menu" onClick={open} className="bg-white/80"><MoreHorizontal className="h-4 w-4" /></IconButton>
                    )}
                    items={[
                      { label: t('common.edit'), icon: <Pencil className="h-4 w-4" />, onClick: () => setEditing(p) },
                      { label: t('transfer.exportBackup'), icon: <exportIcons.backup className="h-4 w-4" />, onClick: () => exportProject(p.id, 'backup', t) },
                      { label: t('transfer.exportStructure'), icon: <exportIcons.structure className="h-4 w-4" />, onClick: () => exportProject(p.id, 'structure', t) },
                      { label: t('home.deletePipe'), icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setDeleting(p) },
                    ]}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {pipes?.length === 0 && <p className="mt-6 text-sm text-slate-500">{t('home.empty')}</p>}
      </main>

      <PipeDialog
        pipe={editing}
        onClose={() => setEditing(null)}
        onSaved={(id, isNew) => {
          qc.invalidateQueries({ queryKey: ['pipes'] })
          if (isNew) nav(`/pipe/${id}`)
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('home.deletePipeTitle', { name: deleting?.name })}
        body={t('home.deletePipeBody', { count: deleting?.card_count ?? 0 })}
        confirmText={deleting?.name}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          await repo.deletePipe(deleting!.id)
          qc.invalidateQueries({ queryKey: ['pipes'] })
        }}
      />
    </div>
  )
}

function PipeDialog({ pipe, onClose, onSaved }: { pipe: PipeSummary | 'new' | null; onClose: () => void; onSaved: (id: string, isNew: boolean) => void }) {
  const { t } = useTranslation()
  const existing = pipe && pipe !== 'new' ? pipe : null
  const [name, setName] = useState('')
  const [color, setColor] = useState('#0d9488')
  const [icon, setIcon] = useState<string>('clipboard')
  const [lastPipe, setLastPipe] = useState<typeof pipe>(null)
  if (pipe !== lastPipe) {
    // reset form when dialog opens for a different pipe
    setLastPipe(pipe)
    setName(existing?.name ?? '')
    setColor(existing?.color ?? '#0d9488')
    setIcon(existing?.icon ?? 'clipboard')
  }

  const save = useMutation({
    mutationFn: async () => {
      if (existing) { await repo.updatePipe(existing.id, { name: name.trim(), color, icon }); return existing.id }
      return (await repo.createPipe({ name: name.trim(), color, icon })).id
    },
    onSuccess: (id) => { onSaved(id, !existing); onClose() },
    onError: () => toast.error(t('common.error')),
  })

  return (
    <Modal
      open={!!pipe}
      onClose={onClose}
      title={existing ? t('common.edit') : t('home.newPipe')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button form="pipe-form" type="submit" loading={save.isPending} disabled={!name.trim()}>
            {existing ? t('common.save') : t('common.create')}
          </Button>
        </>
      }
    >
      <form id="pipe-form" className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <div className="flex items-center gap-3">
          <PipeIcon name={icon} color={color} size="lg" />
          <div className="flex-1">
            <Label htmlFor="pipe-name">{t('home.pipeName')}</Label>
            <Input id="pipe-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
        </div>
        <div>
          <Label>{t('home.icon')}</Label>
          <div className="flex flex-wrap gap-2">
            {PIPE_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={clsx('rounded-xl p-0.5 ring-2 transition', icon === ic ? 'ring-brand-500' : 'ring-transparent hover:ring-slate-200')}
              >
                <PipeIcon name={ic} color={icon === ic ? color : '#94a3b8'} size="sm" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>{t('home.color')}</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
      </form>
    </Modal>
  )
}
