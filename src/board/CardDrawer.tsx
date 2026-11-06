import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle, ArrowRight, Check, ChevronDown, Clock, Globe, History, Loader2, MoveRight, PenLine, Plus, Trash2, UserRound, X,
} from 'lucide-react'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog, IconButton } from '../components/ui'
import { FieldInput } from '../forms/FieldInput'
import { isVisible } from '../forms/logic'
import { formatValue, timeSince } from '../lib/format'
import { repo } from '../lib/repo'
import type { AttachmentValue, Board, Card, CardEvent, Field, FieldValue, Phase } from '../lib/types'
import { allowedTargets, missingRequired } from './rules'

interface Props {
  board: Board
  card: Card
  onClose: () => void
  onMoved: (cardId: string, phaseId: string) => Promise<void>
  onDeleted: () => void
}

export function CardDrawer({ board, card, onClose, onMoved, onDeleted }: Props) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, FieldValue>>(card.values)
  const [title, setTitle] = useState(card.title)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showErrors, setShowErrors] = useState(false)
  const [moving, setMoving] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ title?: string; values?: Record<string, FieldValue> } | null>(null)

  const phase = board.phases.find((p) => p.id === card.phase_id)!
  const fieldsOf = (phaseId: string | null) => board.fields.filter((f) => f.phase_id === phaseId).sort((a, b) => a.position - b.position)
  const startFields = fieldsOf(null)
  const currentFields = fieldsOf(phase.id)
  const otherPhases = board.phases.filter((p) => p.id !== phase.id && fieldsOf(p.id).length > 0)

  const events = useQuery({ queryKey: ['events', card.id], queryFn: () => repo.getCardEvents(card.id) })

  // Card switched or moved from outside: reset local copy
  useEffect(() => { setValues(card.values); setTitle(card.title) }, [card.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const body = pending.current
    pending.current = null
    if (!body) return
    setSaveState('saving')
    try {
      await repo.updateCard(card.id, body)
      setSaveState('saved')
      qc.invalidateQueries({ queryKey: ['board', card.pipe_id] })
      qc.invalidateQueries({ queryKey: ['events', card.id] })
    } catch {
      setSaveState('idle')
      toast.error(t('common.error'))
    }
  }, [card.id, card.pipe_id, qc, t])

  // Save on unmount (closing the drawer)
  useEffect(() => () => { void flush() }, [flush])

  function queue(patch: { title?: string; values?: Record<string, FieldValue> }) {
    pending.current = { ...pending.current, ...patch }
    setSaveState('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, 600)
  }

  function setValue(id: string, v: FieldValue) {
    const next = { ...values, [id]: v }
    setValues(next)
    queue({ values: next })
  }

  const missing = missingRequired(board.fields, phase.id, values)
  const targets = allowedTargets(board.transitions, phase.id)
  const moveOptions: Phase[] = (targets.length ? board.phases.filter((p) => targets.includes(p.id)) : board.phases.filter((p) => p.id !== phase.id))
    .sort((a, b) => a.position - b.position)

  async function moveTo(p: Phase) {
    if (missing.length) { setShowErrors(true); return }
    setMoving(p.id)
    await flush()
    try {
      await onMoved(card.id, p.id)
      toast.success(t('board.moved', { to: p.name }))
      setShowErrors(false)
      qc.invalidateQueries({ queryKey: ['events', card.id] })
    } catch {
      toast.error(t('common.error'))
    } finally { setMoving(null) }
  }

  async function openFile(a: AttachmentValue) {
    const url = await repo.getFileUrl(a.path)
    if (url) window.open(url, '_blank', 'noopener')
    else toast.info(t('card.fileDemo'))
  }

  const fieldName = useMemo(() => Object.fromEntries(board.fields.map((f) => [f.id, f])), [board.fields])
  const phaseName = (id: unknown) => board.phases.find((p) => p.id === id)?.name ?? '—'

  const renderFields = (list: Field[], errorsOn: boolean) =>
    list.filter((f) => isVisible(f, values)).map((f) => (
      <motion.div key={f.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <FieldInput
          field={f}
          value={values[f.id]}
          onChange={(v) => setValue(f.id, v)}
          error={errorsOn && missing.some((m) => m.id === f.id) ? t('forms.errRequired') : undefined}
          onUpload={(file) => repo.uploadCardFile(card.id, file)}
          onOpenFile={openFile}
        />
      </motion.div>
    ))

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-7">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md px-2 py-0.5 font-semibold text-white" style={{ background: phase.color }}>{phase.name}</span>
            <span className="inline-flex items-center gap-1 text-slate-500"><Clock className="h-3.5 w-3.5" /> {t('board.inPhaseFor', { time: timeSince(card.phase_entered_at, i18n.language) })}</span>
            {card.created_via === 'public_form' && <span className="inline-flex items-center gap-1 text-slate-500"><Globe className="h-3.5 w-3.5" /> {t('board.viaForm')}</span>}
          </div>
          <div className="group mt-1.5 flex items-center gap-2">
            <input
              aria-label={t('board.cardTitle')}
              value={title}
              onChange={(e) => { setTitle(e.target.value); queue({ title: e.target.value }) }}
              className="w-full min-w-0 rounded-lg bg-transparent px-1 py-0.5 -ml-1 text-xl font-bold tracking-tight text-slate-900 outline-none transition hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-brand-200 sm:text-2xl"
            />
            <PenLine className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
          </div>
        </div>
        <SaveBadge state={saveState} />
        <IconButton label={t('common.close')} onClick={onClose}><X className="h-5 w-5" /></IconButton>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_260px] lg:overflow-hidden">
        {/* left: start form + other phases + history */}
        <section className="scroll-thin space-y-3 bg-slate-50/70 p-5 sm:p-7 lg:overflow-y-auto">
          <Section title={t('builder.startForm')} subtitle={new Date(card.created_at).toLocaleString(i18n.language)} defaultOpen>
            <div className="space-y-6">{renderFields(startFields, false)}</div>
          </Section>
          {otherPhases.map((p) => (
            <Section key={p.id} title={p.name} color={p.color} defaultOpen={fieldsOf(p.id).some((f) => values[f.id] !== undefined && values[f.id] !== null)}>
              <div className="space-y-6">{renderFields(fieldsOf(p.id), false)}</div>
            </Section>
          ))}
          <Section title={t('card.history')} icon={<History className="h-4 w-4" />} defaultOpen>
            <Timeline events={events.data} loading={events.isLoading} fieldName={fieldName} phaseName={phaseName} lang={i18n.language} />
          </Section>
        </section>

        {/* middle: current phase */}
        <section className="scroll-thin border-t border-slate-200 p-5 sm:p-7 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: phase.color }} />
            <h3 className="font-semibold text-slate-900">{t('card.currentPhase')}: {phase.name}</h3>
          </div>
          {phase.description && <p className="-mt-3 mb-5 text-sm text-slate-500">{phase.description}</p>}
          {currentFields.length ? (
            <div className="space-y-6">{renderFields(currentFields, showErrors)}</div>
          ) : (
            <p className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              {t('card.noPhaseFields')}
            </p>
          )}
        </section>

        {/* right: move + actions */}
        <aside className="scroll-thin border-t border-slate-200 bg-slate-50/70 p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><MoveRight className="h-4 w-4" /> {t('card.moveTo')}</h3>
          <div className="space-y-2">
            {moveOptions.map((p) => (
              <button
                key={p.id}
                onClick={() => moveTo(p)}
                disabled={!!moving}
                className={clsx(
                  'group flex w-full items-center gap-2 rounded-full border px-4 py-2.5 text-left text-sm font-medium transition disabled:opacity-60',
                  missing.length ? 'border-slate-200 bg-white text-slate-400' : 'bg-white hover:shadow-md',
                )}
                style={missing.length ? undefined : { borderColor: `${p.color}55`, color: p.color }}
              >
                <span className="flex-1 truncate">{p.name}</span>
                {moving === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {missing.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <p className="flex items-center gap-1.5 font-semibold"><AlertCircle className="h-4 w-4" /> {t('card.fillRequired')}</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5">{missing.map((f) => <li key={f.id}>{f.label}</li>)}</ul>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <p>{t('card.created')}: {new Date(card.created_at).toLocaleString(i18n.language)}</p>
            <p>{t('card.updated')}: {new Date(card.updated_at).toLocaleString(i18n.language)}</p>
          </div>
          <button onClick={() => setConfirmDelete(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-rose-600 transition hover:bg-rose-50">
            <Trash2 className="h-4 w-4" /> {t('card.delete')}
          </button>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('card.deleteTitle', { name: title })}
        body={t('card.deleteBody')}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          pending.current = null
          await repo.deleteCard(card.id)
          onDeleted()
        }}
      />
    </div>
  )
}

function SaveBadge({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence mode="wait">
      {state !== 'idle' && (
        <motion.span
          key={state}
          initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={clsx('mt-2 hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs sm:inline-flex', state === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}
        >
          {state === 'saved' ? <Check className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
          {state === 'saved' ? t('common.saved') : t('builder.saving')}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function Section({ title, subtitle, color, icon, defaultOpen, children }: {
  title: string; subtitle?: string; color?: string; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
        {icon ?? <span className="h-2.5 w-2.5 rounded-full" style={{ background: color ?? '#0f172a' }} />}
        <span className="flex-1">
          <span className="block font-semibold text-slate-900">{title}</span>
          {subtitle && <span className="block text-xs text-slate-500">{subtitle}</span>}
        </span>
        <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="border-t border-slate-100 px-4 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Timeline({ events, loading, fieldName, phaseName, lang }: {
  events?: CardEvent[]; loading: boolean; fieldName: Record<string, Field>; phaseName: (id: unknown) => string; lang: string
}) {
  const { t } = useTranslation()
  if (loading) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-300" />
  if (!events?.length) return <p className="text-sm text-slate-400">{t('card.noHistory')}</p>
  const show = (f: Field | undefined, v: unknown) => (f ? formatValue(f, (v ?? null) as FieldValue, lang) : String(v ?? '—'))
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e) => {
        const p = e.payload
        let icon = <PenLine className="h-3 w-3" />
        let text: React.ReactNode
        if (e.type === 'created') {
          icon = <Plus className="h-3 w-3" />
          text = p.via === 'public_form' ? t('card.evCreatedForm') : t('card.evCreated')
        } else if (e.type === 'moved') {
          icon = <MoveRight className="h-3 w-3" />
          text = <>{t('card.evMoved')} <b>{phaseName(p.from)}</b> → <b>{phaseName(p.to)}</b></>
        } else if (e.type === 'title_edited') {
          text = <>{t('card.evTitle')}: <b>{String(p.new ?? '')}</b></>
        } else {
          const f = fieldName[String(p.field_id)]
          text = (
            <>
              <b>{f?.label ?? t('card.removedField')}</b>: <span className="text-slate-400 line-through">{show(f, p.old)}</span> → <span>{show(f, p.new)}</span>
            </>
          )
        }
        return (
          <li key={String(e.id)} className="relative text-sm text-slate-700">
            <span className="absolute -left-[27px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">{icon}</span>
            <p className="break-words leading-snug">{text}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><UserRound className="h-3 w-3" /> {new Date(e.created_at).toLocaleString(lang)}</p>
          </li>
        )
      })}
    </ol>
  )
}
