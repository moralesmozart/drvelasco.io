import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Ban, CheckCircle2, GripVertical, MoreHorizontal, Pencil, Plus, Route, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconButton, Menu } from '../components/ui'
import type { Card, Field, Phase } from '../lib/types'
import { phaseLabel } from '../lib/localize'
import { CardTile } from './CardTile'

interface Props {
  phase: Phase
  cards: Card[]
  totalCount: number
  fields: Field[]
  isFirst: boolean
  isLast: boolean
  blocked: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
  onAddCard?: () => void
  onOpenCard: (c: Card) => void
  onRules?: () => void
}

export function PhaseColumn({ phase, cards, totalCount, fields, isFirst, isLast, blocked, onEdit, onDelete, onMove, onAddCard, onOpenCard, onRules }: Props) {
  const { t, i18n } = useTranslation()
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
    id: `phase:${phase.id}`,
    data: { type: 'phase', phaseId: phase.id },
  })

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={phaseLabel(phase, i18n.language)}
      className={clsx(
        'flex max-h-full w-[300px] shrink-0 flex-col rounded-2xl bg-slate-100/80 transition-opacity',
        isDragging && 'opacity-40',
        blocked && 'opacity-50',
      )}
    >
      <header className="group/h relative rounded-t-2xl border-t-4 bg-white px-3 py-2.5 shadow-card" style={{ borderTopColor: phase.color }}>
        <div className="flex items-center gap-1.5">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label="Drag"
            className="-ml-1 cursor-grab rounded p-0.5 text-slate-300 opacity-0 transition hover:text-slate-500 group-hover/h:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h2 className="truncate font-semibold" style={{ color: phase.color }}>{phaseLabel(phase, i18n.language)}</h2>
          <span className="rounded-md bg-slate-100 px-1.5 text-xs font-semibold tabular-nums text-slate-600">{totalCount}</span>
          {phase.is_final && (
            <span title={t('board.final')}><CheckCircle2 className="h-4 w-4 text-emerald-500" /></span>
          )}
          <div className="ml-auto flex items-center">
            {onAddCard && (
              <IconButton label={t('board.newCard')} onClick={onAddCard}><Plus className="h-4 w-4" /></IconButton>
            )}
            <Menu
              trigger={(open) => <IconButton label="Menu" onClick={open}><MoreHorizontal className="h-4 w-4" /></IconButton>}
              items={[
                { label: t('board.editPhase'), icon: <Pencil className="h-4 w-4" />, onClick: onEdit },
                ...(onRules ? [{ label: t('rules.menu'), icon: <Route className="h-4 w-4" />, onClick: onRules }] : []),
                { label: t('board.moveLeft'), icon: <ArrowLeft className="h-4 w-4" />, onClick: () => onMove(-1), disabled: isFirst },
                { label: t('board.moveRight'), icon: <ArrowRight className="h-4 w-4" />, onClick: () => onMove(1), disabled: isLast },
                { label: t('board.deletePhase'), icon: <Trash2 className="h-4 w-4" />, onClick: onDelete, danger: true },
              ]}
            />
          </div>
        </div>
        {phase.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{phase.description}</p>}
        {blocked && (
          <div className="absolute inset-0 grid place-items-center rounded-t-2xl bg-white/70">
            <Ban className="h-5 w-5 text-slate-400" />
          </div>
        )}
      </header>

      <div className="scroll-thin min-h-24 flex-1 space-y-2.5 overflow-y-auto p-2.5">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {cards.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CardTile card={c} fields={fields} isFinal={phase.is_final} onOpen={() => onOpenCard(c)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
        {cards.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">{isFirst ? t('board.emptyFirst') : t('board.emptyOther')}</p>
        )}
      </div>
    </section>
  )
}
