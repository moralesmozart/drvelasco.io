import {
  closestCenter, closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin,
  TouchSensor, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, LayoutList, Link2, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CardContent } from '../board/CardTile'
import { DeletePhaseDialog, PhaseDialog } from '../board/PhaseDialogs'
import { PhaseColumn } from '../board/PhaseColumn'
import { allowedTargets, canMove, groupByPhase, positionAt } from '../board/rules'
import { Header, PipeIcon } from '../components/Layout'
import { Button, Input, Label, Modal, Spinner } from '../components/ui'
import { formatValue } from '../lib/format'
import { repo } from '../lib/repo'
import type { Card, Phase } from '../lib/types'

const isPhaseId = (id: unknown) => typeof id === 'string' && id.startsWith('phase:')
const stripPhase = (id: string) => id.slice(6)

export default function Board() {
  const { pipeId = '' } = useParams()
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['board', pipeId], queryFn: () => repo.getBoard(pipeId), staleTime: 0 })

  const [phases, setPhases] = useState<Phase[]>([])
  const [byPhase, setByPhase] = useState<Record<string, Card[]>>({})
  const [active, setActive] = useState<{ type: 'card'; card: Card } | { type: 'phase'; phase: Phase } | null>(null)
  const dragFrom = useRef<string | null>(null)
  const [query, setQuery] = useState('')

  const [phaseDialog, setPhaseDialog] = useState<{ phase: Phase | null } | null>(null)
  const [deleting, setDeleting] = useState<Phase | null>(null)
  const [newCardPhase, setNewCardPhase] = useState<string | null>(null)
  const [openCard, setOpenCard] = useState<Card | null>(null)

  // Sync server → local state (skipped mid-drag so the board doesn't jump)
  useEffect(() => {
    if (!data || active) return
    setPhases(data.phases)
    setByPhase(groupByPhase(data.cards, data.phases.map((p) => p.id)))
  }, [data, active])

  useEffect(() => repo.subscribe(pipeId, () => qc.invalidateQueries({ queryKey: ['board', pipeId] })), [pipeId, qc])

  const refresh = () => qc.invalidateQueries({ queryKey: ['board', pipeId] })
  const transitions = useMemo(() => data?.transitions ?? [], [data])
  const startFields = useMemo(() => (data?.fields ?? []).filter((f) => f.phase_id === null), [data])
  const phaseName = (id: string) => phases.find((p) => p.id === id)?.name ?? ''

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return byPhase
    return Object.fromEntries(
      Object.entries(byPhase).map(([k, list]) => [
        k,
        list.filter((c) => [c.title, ...Object.values(c.values).flat()].some((v) => String(v ?? '').toLowerCase().includes(q))),
      ]),
    )
  }, [byPhase, query])

  /* ───────── drag & drop ───────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const collision: CollisionDetection = (args) => {
    if (args.active.data.current?.type === 'phase') {
      return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === 'phase') })
    }
    const hits = pointerWithin(args)
    const cardHit = hits.find((h) => !isPhaseId(h.id))
    if (cardHit) return [cardHit]
    if (hits.length) return hits
    return closestCorners(args)
  }

  const containerOf = (id: string) => {
    if (isPhaseId(id)) return stripPhase(id)
    return Object.keys(byPhase).find((k) => byPhase[k].some((c) => c.id === id)) ?? null
  }

  function onDragStart(e: DragStartEvent) {
    const type = e.active.data.current?.type
    if (type === 'phase') {
      const phase = phases.find((p) => p.id === stripPhase(String(e.active.id)))
      if (phase) setActive({ type: 'phase', phase })
    } else {
      const from = containerOf(String(e.active.id))
      const card = from ? byPhase[from].find((c) => c.id === e.active.id) : undefined
      if (card && from) { dragFrom.current = from; setActive({ type: 'card', card }) }
    }
  }

  function onDragOver(e: DragOverEvent) {
    if (active?.type !== 'card' || !e.over) return
    const from = containerOf(String(e.active.id))
    const to = containerOf(String(e.over.id))
    if (!from || !to || from === to) return
    if (!canMove(transitions, dragFrom.current!, to)) return // blocked column: card stays put
    setByPhase((prev) => {
      const moving = prev[from].find((c) => c.id === e.active.id)!
      const target = prev[to]
      const overIndex = isPhaseId(e.over!.id) ? target.length : target.findIndex((c) => c.id === e.over!.id)
      return {
        ...prev,
        [from]: prev[from].filter((c) => c.id !== e.active.id),
        [to]: [...target.slice(0, overIndex), { ...moving, phase_id: to }, ...target.slice(overIndex)],
      }
    })
  }

  async function onDragEnd(e: DragEndEvent) {
    const was = active
    setActive(null)
    const over = e.over
    if (!was || !over) { refresh(); return }

    if (was.type === 'phase') {
      const oldIndex = phases.findIndex((p) => p.id === was.phase.id)
      const newIndex = phases.findIndex((p) => p.id === stripPhase(String(over.id)))
      if (newIndex < 0 || oldIndex === newIndex) return
      const next = arrayMove(phases, oldIndex, newIndex)
      setPhases(next)
      await repo.reorderPhases(next.map((p) => p.id)).catch(() => toast.error(t('common.error')))
      refresh()
      return
    }

    const origin = dragFrom.current!
    const container = containerOf(String(e.active.id))!
    let list = byPhase[container]
    const overId = String(over.id)
    if (!isPhaseId(overId) && containerOf(overId) === container) {
      list = arrayMove(list, list.findIndex((c) => c.id === e.active.id), list.findIndex((c) => c.id === overId))
    }
    const index = list.findIndex((c) => c.id === e.active.id)

    const overTarget = isPhaseId(overId) ? stripPhase(overId) : containerOf(overId)
    if (overTarget && overTarget !== origin && !canMove(transitions, origin, overTarget)) {
      const names = allowedTargets(transitions, origin).map(phaseName).map((n) => `"${n}"`).join(', ')
      toast.error(t('board.moveBlocked', { from: phaseName(origin), to: names }))
      setByPhase(groupByPhase(data!.cards, phases.map((p) => p.id))) // snap back to where it was
      return
    }

    const position = positionAt(list, index)
    setByPhase((prev) => ({ ...prev, [container]: list.map((c, i) => (i === index ? { ...c, position } : c)) }))
    try {
      await repo.moveCard(String(e.active.id), container, position)
      if (container !== origin) toast.success(t('board.moved', { to: phaseName(container) }))
    } catch {
      toast.error(t('common.error'))
    }
    refresh()
  }

  /* ───────── phase actions ───────── */
  async function movePhase(id: string, dir: -1 | 1) {
    const i = phases.findIndex((p) => p.id === id)
    const next = arrayMove(phases, i, i + dir)
    setPhases(next)
    await repo.reorderPhases(next.map((p) => p.id))
    refresh()
  }

  if (isLoading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  if (error || !data) return <div className="grid min-h-screen place-items-center text-slate-500">{t('common.error')}</div>

  const formUrl = `${location.origin}${location.pathname}#/f/${data.pipe.form_slug}`
  const blockedFor = (phaseId: string) =>
    active?.type === 'card' && dragFrom.current !== null && !canMove(transitions, dragFrom.current, phaseId)

  return (
    <div className="flex h-screen flex-col">
      <Header
        left={
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('common.back')}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <PipeIcon name={data.pipe.icon} color={data.pipe.color} size="sm" />
            <h1 className="truncate text-lg font-semibold">{data.pipe.name}</h1>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common.search')} className="h-9 pl-9 pr-8" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="clear">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <Link to={`/pipe/${pipeId}/form`}>
            <Button variant="secondary" size="sm"><LayoutList className="h-4 w-4" /> {t('board.forms')}</Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigator.clipboard.writeText(formUrl).then(() => toast.success(t('board.linkCopied')))}
          >
            <Link2 className="h-4 w-4" /> {t('board.publicForm')}
          </Button>
        </div>
      </div>

      <main className="scroll-thin flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActive(null); refresh() }}>
          <div className="flex h-full items-start gap-4 p-4 sm:p-6">
            <SortableContext items={phases.map((p) => `phase:${p.id}`)} strategy={horizontalListSortingStrategy}>
              {phases.map((p, i) => (
                <PhaseColumn
                  key={p.id}
                  phase={p}
                  cards={filtered[p.id] ?? []}
                  totalCount={byPhase[p.id]?.length ?? 0}
                  fields={startFields}
                  isFirst={i === 0}
                  isLast={i === phases.length - 1}
                  blocked={blockedFor(p.id)}
                  onEdit={() => setPhaseDialog({ phase: p })}
                  onDelete={() => setDeleting(p)}
                  onMove={(dir) => movePhase(p.id, dir)}
                  onAddCard={i === 0 ? () => setNewCardPhase(p.id) : undefined}
                  onOpenCard={setOpenCard}
                />
              ))}
            </SortableContext>
            <button
              onClick={() => setPhaseDialog({ phase: null })}
              className="flex h-12 w-[260px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700"
            >
              <Plus className="h-4 w-4" /> {t('board.addPhase')}
            </button>
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
            {active?.type === 'card' && (
              <div className="w-[280px]"><CardContent card={active.card} fields={startFields} overlay /></div>
            )}
            {active?.type === 'phase' && (
              <div className="w-[300px] rotate-1 rounded-2xl border-t-4 bg-white px-4 py-3 font-semibold shadow-lift" style={{ borderTopColor: active.phase.color, color: active.phase.color }}>
                {active.phase.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      <PhaseDialog
        open={!!phaseDialog}
        phase={phaseDialog?.phase ?? null}
        onClose={() => setPhaseDialog(null)}
        onSave={async (input) => {
          if (phaseDialog?.phase) await repo.updatePhase(phaseDialog.phase.id, input)
          else await repo.createPhase(pipeId, input, phases.length)
          refresh()
        }}
      />
      <DeletePhaseDialog
        phase={deleting}
        phases={phases}
        cardCount={deleting ? byPhase[deleting.id]?.length ?? 0 : 0}
        onClose={() => setDeleting(null)}
        onConfirm={async (moveTo) => {
          await repo.deletePhase(deleting!.id, moveTo)
          refresh()
        }}
      />
      <NewCardDialog
        open={!!newCardPhase}
        onClose={() => setNewCardPhase(null)}
        onCreate={async (title) => {
          const titleField = startFields.find((f) => f.type === 'short_text')
          await repo.createCard(pipeId, newCardPhase!, title, titleField ? { [titleField.id]: title } : {})
          refresh()
        }}
      />
      <Modal open={!!openCard} onClose={() => setOpenCard(null)} title={openCard?.title} width="max-w-lg">
        {openCard && (
          <div className="space-y-4">
            <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: phases.find((p) => p.id === openCard.phase_id)?.color }}>
              {phaseName(openCard.phase_id)}
            </span>
            <dl className="space-y-3">
              {startFields.filter((f) => f.type !== 'info').map((f) => (
                <div key={f.id}>
                  <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                  <dd className="text-sm text-slate-800">{formatValue(f, openCard.values[f.id] ?? null, i18n.language)}</dd>
                </div>
              ))}
            </dl>
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">{t('board.openCardSoon')}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function NewCardDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('board.newCard')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button form="new-card" type="submit" loading={busy} disabled={!title.trim()}>{t('common.create')}</Button>
        </>
      }
    >
      <form
        id="new-card"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try { await onCreate(title.trim()); setTitle(''); onClose() } finally { setBusy(false) }
        }}
      >
        <Label htmlFor="card-title">{t('board.cardTitle')}</Label>
        <Input id="card-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
    </Modal>
  )
}
