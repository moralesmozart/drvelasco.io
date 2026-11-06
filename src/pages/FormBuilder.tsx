import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Copy, ExternalLink, GitBranch, GripVertical, Palette, Plus, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Header, PipeIcon } from '../components/Layout'
import { Button, ColorPicker, ConfirmDialog, IconButton, Input, Label, Spinner, Textarea, Toggle } from '../components/ui'
import { fieldMeta, FIELD_TYPES } from '../forms/fieldTypes'
import { repo } from '../lib/repo'
import type { Field, FieldCondition, FieldInput as FieldInputT, FieldType, FormSettings } from '../lib/types'

const BG_COLORS = ['#8bbcb4', '#b2d8e8', '#c7d2fe', '#e9d5ff', '#fbcfe8', '#fde68a', '#d9f99d', '#e2e8f0']

export default function FormBuilder() {
  const { pipeId = '' } = useParams()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['board', pipeId], queryFn: () => repo.getBoard(pipeId) })

  const [scope, setScope] = useState<string | null>(null) // null = start form
  const [fields, setFields] = useState<Field[]>([])
  const [selected, setSelected] = useState<string | 'settings' | null>(null)
  const [deleting, setDeleting] = useState<Field | null>(null)
  const [saving, setSaving] = useState(0)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  const busy = saving > 0 || dirty.size > 0
  useEffect(() => {
    if (data && !busy) setFields(data.fields)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const scoped = useMemo(
    () => fields.filter((f) => f.phase_id === scope).sort((a, b) => a.position - b.position),
    [fields, scope],
  )
  const current = typeof selected === 'string' && selected !== 'settings' ? fields.find((f) => f.id === selected) : undefined
  const refresh = () => qc.invalidateQueries({ queryKey: ['board', pipeId] })

  async function track<T>(p: Promise<T>) {
    setSaving((n) => n + 1)
    try { return await p } catch (e) { toast.error(t('common.error')); throw e } finally { setSaving((n) => n - 1) }
  }

  /** Local update now, debounced save (one request per field after typing stops). */
  const patchBuffer = useRef<Record<string, Partial<FieldInputT>>>({})
  function patchField(id: string, patch: Partial<FieldInputT>) {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    patchBuffer.current[id] = { ...patchBuffer.current[id], ...patch }
    clearTimeout(timers.current[id])
    setDirty((d) => new Set(d).add(id))
    timers.current[id] = setTimeout(async () => {
      const body = patchBuffer.current[id]
      delete patchBuffer.current[id]
      try { await track(repo.updateField(id, body)) } catch { /* toast shown by track */ } finally {
        setDirty((d) => { const n = new Set(d); n.delete(id); return n })
      }
    }, 500)
  }

  async function addField(type: FieldType) {
    const meta = fieldMeta(type)
    const input: FieldInputT = {
      phase_id: scope, type, label: type === 'info' ? '' : t('builder.newFieldLabel'), description: null,
      required: false, options: meta.hasOptions ? ['Opção 1', 'Opção 2'] : [], conditions: [], show_on_card: false,
    }
    const created = await track(repo.createField(pipeId, input, scoped.length))
    setFields((fs) => [...fs, created])
    setSelected(created.id)
    refresh()
  }

  async function duplicate(f: Field) {
    const { id: _id, pipe_id: _p, position: _pos, ...rest } = f
    void _id; void _p; void _pos
    const created = await track(repo.createField(pipeId, { ...rest, label: `${f.label} (2)` }, scoped.length))
    setFields((fs) => [...fs, created])
    setSelected(created.id)
    refresh()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const ids = scoped.map((f) => f.id)
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)))
    setFields((fs) => fs.map((f) => (next.includes(f.id) ? { ...f, position: next.indexOf(f.id) } : f)))
    await track(repo.reorderFields(next))
    refresh()
  }

  if (isLoading || !data) return <div className="grid min-h-screen place-items-center"><Spinner /></div>

  const formUrl = `${location.origin}${location.pathname}#/f/${data.pipe.form_slug}`
  const scopes = [{ id: null as string | null, name: t('builder.startForm'), color: '#0f172a' }, ...data.phases.map((p) => ({ id: p.id as string | null, name: p.name, color: p.color }))]

  return (
    <div className="flex h-screen flex-col">
      <Header
        left={
          <div className="flex min-w-0 items-center gap-2">
            <Link to={`/pipe/${pipeId}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('common.back')}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <PipeIcon name={data.pipe.icon} color={data.pipe.color} size="sm" />
            <h1 className="truncate text-lg font-semibold">{data.pipe.name}</h1>
            <span className="text-slate-300">/</span>
            <span className="truncate text-slate-600">{t('builder.title')}</span>
            <AnimatePresence>
              {busy && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-2 text-xs text-slate-400">
                  {t('builder.saving')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        }
      />

      {/* scope tabs */}
      <div className="scroll-thin flex gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
        {scopes.map((s) => (
          <button
            key={s.id ?? 'start'}
            onClick={() => { setScope(s.id); setSelected(null) }}
            className={clsx(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
              scope === s.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: scope === s.id ? '#fff' : s.color }} />
            {s.name}
            <span className={clsx('text-xs tabular-nums', scope === s.id ? 'text-white/70' : 'text-slate-400')}>
              {fields.filter((f) => f.phase_id === s.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
        {/* palette */}
        <aside className="scroll-thin hidden overflow-y-auto border-r border-slate-200 bg-white p-4 lg:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('builder.fieldTypes')}</p>
          <div className="space-y-1">
            {FIELD_TYPES.map(({ type, icon: Icon }) => (
              <button
                key={type}
                onClick={() => addField(type)}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-brand-50 hover:text-brand-800"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-500 transition group-hover:bg-brand-100 group-hover:text-brand-700">
                  <Icon className="h-4 w-4" />
                </span>
                {t(`types.${type}`)}
                <Plus className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </aside>

        {/* field list */}
        <main className="scroll-thin overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm text-slate-500">{scope === null ? t('builder.startFormHint') : t('builder.phaseFormHint')}</p>
              {scope === null && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelected('settings')}><Palette className="h-4 w-4" /> {t('builder.settings')}</Button>
                  <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(formUrl).then(() => toast.success(t('board.linkCopied')))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a href={formUrl} target="_blank" rel="noreferrer">
                    <Button size="sm"><ExternalLink className="h-4 w-4" /> {t('builder.preview')}</Button>
                  </a>
                </div>
              )}
            </div>

            {/* mobile add */}
            <div className="mb-4 lg:hidden">
              <select
                value=""
                onChange={(e) => e.target.value && addField(e.target.value as FieldType)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">+ {t('builder.addField')}</option>
                {FIELD_TYPES.map(({ type }) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
              </select>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={scoped.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {scoped.map((f) => (
                    <FieldRow
                      key={f.id}
                      field={f}
                      active={selected === f.id}
                      onSelect={() => setSelected(f.id)}
                      onDuplicate={() => duplicate(f)}
                      onDelete={() => setDeleting(f)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {scoped.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{t('builder.empty')}</div>
            )}
          </div>
        </main>

        {/* editor */}
        <aside
          className={clsx(
            'scroll-thin overflow-y-auto border-l border-slate-200 bg-white',
            'fixed inset-x-0 bottom-0 top-24 z-30 transition-transform lg:static lg:translate-y-0',
            selected ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          <div className="flex items-center justify-end px-3 pt-3 lg:hidden">
            <IconButton label={t('common.close')} onClick={() => setSelected(null)}><X className="h-4 w-4" /></IconButton>
          </div>
          {selected === 'settings' ? (
            <SettingsEditor
              settings={data.pipe.form_settings as FormSettings}
              onSave={async (s) => { await track(repo.updateFormSettings(pipeId, s)); refresh() }}
            />
          ) : current ? (
            <FieldEditor
              key={current.id}
              field={current}
              candidates={[
                ...fields.filter((f) => f.phase_id === null).sort((a, b) => a.position - b.position),
                ...(scope ? scoped : []),
              ].filter((f) => f.id !== current.id && f.type !== 'info' && f.type !== 'attachment' && (f.phase_id !== current.phase_id || f.position < current.position))}
              onChange={(p) => patchField(current.id, p)}
            />
          ) : (
            <p className="hidden p-8 text-center text-sm text-slate-400 lg:block">{t('builder.selectField')}</p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('builder.deleteFieldTitle', { name: deleting?.label || t(`types.${deleting?.type ?? 'info'}`) })}
        body={t('builder.deleteFieldBody')}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          await track(repo.deleteField(deleting!.id))
          setFields((fs) => fs.filter((f) => f.id !== deleting!.id))
          if (selected === deleting!.id) setSelected(null)
          refresh()
        }}
      />
    </div>
  )
}

function FieldRow({ field, active, onSelect, onDuplicate, onDelete }: { field: Field; active: boolean; onSelect: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
  const Icon = fieldMeta(field.type).icon
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx(
        'group flex items-center gap-2 rounded-xl border bg-white p-3 shadow-card transition',
        active ? 'border-brand-400 ring-4 ring-brand-100' : 'border-slate-200 hover:border-slate-300',
        isDragging && 'z-10 opacity-80 shadow-lift',
      )}
    >
      <button ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label="Drag" className="cursor-grab rounded p-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-900">
            {field.label || <span className="italic text-slate-400">{t(`types.${field.type}`)}</span>}
            {field.required && <span className="ml-0.5 text-rose-500">*</span>}
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            {t(`types.${field.type}`)}
            {field.conditions.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700">
                <GitBranch className="h-3 w-3" /> {t('builder.conditional')}
              </span>
            )}
          </span>
        </span>
      </button>
      <div className="flex opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconButton label={t('builder.duplicate')} onClick={onDuplicate}><Copy className="h-4 w-4" /></IconButton>
        <IconButton label={t('builder.deleteField')} onClick={onDelete} className="hover:text-rose-600"><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    </div>
  )
}

function FieldEditor({ field, candidates, onChange }: { field: Field; candidates: Field[]; onChange: (p: Partial<FieldInputT>) => void }) {
  const { t } = useTranslation()
  const meta = fieldMeta(field.type)
  const [newOpt, setNewOpt] = useState('')

  const setCond = (i: number, patch: Partial<FieldCondition>) =>
    onChange({ conditions: field.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) })

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <meta.icon className="h-4 w-4" /> {t(`types.${field.type}`)}
      </div>
      <div>
        <Label htmlFor="fe-label">{t('builder.label')}</Label>
        <Textarea id="fe-label" rows={2} value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="fe-desc">{t('builder.description')}</Label>
        <Textarea id="fe-desc" rows={field.type === 'info' ? 5 : 2} value={field.description ?? ''} onChange={(e) => onChange({ description: e.target.value || null })} />
      </div>

      {field.type !== 'info' && (
        <div className="space-y-4">
          <Toggle checked={field.required} onChange={(required) => onChange({ required })} label={t('builder.required')} />
          {field.phase_id === null && (
            <Toggle checked={field.show_on_card} onChange={(show_on_card) => onChange({ show_on_card })} label={t('builder.showOnCard')} hint={t('builder.showOnCardHint')} />
          )}
        </div>
      )}

      {meta.hasOptions && (
        <div>
          <Label>{t('builder.options')}</Label>
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {field.options.map((o, i) => (
                <motion.li key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5">
                  <Input value={o} onChange={(e) => onChange({ options: field.options.map((x, j) => (j === i ? e.target.value : x)) })} className="h-9" />
                  <IconButton label={t('common.delete')} onClick={() => onChange({ options: field.options.filter((_, j) => j !== i) })} className="hover:text-rose-600">
                    <X className="h-4 w-4" />
                  </IconButton>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <form
            className="mt-2 flex gap-1.5"
            onSubmit={(e) => { e.preventDefault(); if (newOpt.trim()) { onChange({ options: [...field.options, newOpt.trim()] }); setNewOpt('') } }}
          >
            <Input value={newOpt} onChange={(e) => setNewOpt(e.target.value)} placeholder={t('builder.optionPlaceholder')} className="h-9" />
            <Button type="submit" variant="secondary" size="sm" className="h-9" disabled={!newOpt.trim()}><Plus className="h-4 w-4" /></Button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-violet-900"><GitBranch className="h-4 w-4" /> {t('builder.conditions')}</p>
        <p className="mt-0.5 text-xs text-violet-700/80">{t('builder.conditionsHint')}</p>
        {candidates.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">{t('builder.noConditionFields')}</p>
        ) : (
          <>
            <div className="mt-3 space-y-3">
              {field.conditions.map((c, i) => {
                const src = candidates.find((f) => f.id === c.field_id)
                return (
                  <div key={i} className="space-y-1.5 rounded-lg bg-white p-2.5 shadow-card">
                    <div className="flex gap-1.5">
                      <select value={c.field_id} onChange={(e) => setCond(i, { field_id: e.target.value, value: '' })} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm">
                        {candidates.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                      <IconButton label={t('common.delete')} onClick={() => onChange({ conditions: field.conditions.filter((_, j) => j !== i) })} className="hover:text-rose-600">
                        <X className="h-4 w-4" />
                      </IconButton>
                    </div>
                    <div className="flex gap-1.5">
                      <select value={c.op} onChange={(e) => setCond(i, { op: e.target.value as FieldCondition['op'] })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
                        {(['equals', 'contains', 'filled'] as const).map((op) => <option key={op} value={op}>{t(`builder.op_${op}`)}</option>)}
                      </select>
                      {c.op !== 'filled' && (
                        src && src.options.length > 0 ? (
                          <select value={c.value ?? ''} onChange={(e) => setCond(i, { value: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm">
                            <option value="">—</option>
                            {src.options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <Input value={c.value ?? ''} onChange={(e) => setCond(i, { value: e.target.value })} placeholder={t('builder.value')} className="h-9 min-w-0 flex-1" />
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-violet-700 hover:bg-violet-100"
              onClick={() => onChange({ conditions: [...field.conditions, { field_id: candidates[0].id, op: 'equals', value: candidates[0].options[0] ?? '' }] })}
            >
              <Plus className="h-4 w-4" /> {t('builder.addCondition')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function SettingsEditor({ settings, onSave }: { settings: FormSettings; onSave: (s: FormSettings) => Promise<void> }) {
  const { t } = useTranslation()
  const [s, setS] = useState<FormSettings>(settings)
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="space-y-5 p-5"
      onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSave(s); toast.success(t('common.saved')) } finally { setBusy(false) } }}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><Palette className="h-4 w-4" /> {t('builder.settings')}</p>
      <div className="rounded-xl bg-care-50 p-3">
        <p className="mb-3 text-xs text-care-800">{t('builder.logoHint')}</p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="fs-kicker">{t('builder.logoKicker')}</Label>
            <Input id="fs-kicker" value={s.logo_kicker ?? ''} onChange={(e) => setS({ ...s, logo_kicker: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="fs-name">{t('builder.logoName')}</Label>
            <Input id="fs-name" value={s.logo_name ?? ''} onChange={(e) => setS({ ...s, logo_name: e.target.value })} />
          </div>
        </div>
      </div>
      <div>
        <Label htmlFor="fs-title">{t('builder.formTitle')}</Label>
        <Input id="fs-title" value={s.title ?? ''} onChange={(e) => setS({ ...s, title: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="fs-desc">{t('builder.formDescription')}</Label>
        <Textarea id="fs-desc" rows={5} value={s.description ?? ''} onChange={(e) => setS({ ...s, description: e.target.value })} />
      </div>
      <div>
        <Label>{t('builder.bgColor')}</Label>
        <div className="flex flex-wrap gap-2">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setS({ ...s, brand_color: c })}
              className="h-8 w-8 rounded-full border border-black/5 transition hover:scale-110"
              style={{ background: c, boxShadow: (s.brand_color ?? '#8bbcb4') === c ? `0 0 0 2px white, 0 0 0 4px #334155` : undefined }}
            />
          ))}
        </div>
        <div className="mt-3"><ColorPicker value={s.brand_color ?? ''} onChange={(brand_color) => setS({ ...s, brand_color })} /></div>
      </div>
      <div>
        <Label htmlFor="fs-success">{t('builder.successMessage')}</Label>
        <Textarea id="fs-success" rows={2} value={s.success_message ?? ''} onChange={(e) => setS({ ...s, success_message: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="fs-submit">{t('builder.submitLabel')}</Label>
        <Input id="fs-submit" value={s.submit_label ?? ''} placeholder={t('forms.submit')} onChange={(e) => setS({ ...s, submit_label: e.target.value })} />
      </div>
      <Button type="submit" loading={busy} className="w-full">{t('common.save')}</Button>
    </form>
  )
}
