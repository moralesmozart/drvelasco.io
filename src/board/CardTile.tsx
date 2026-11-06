import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, ChevronRight, Clock, Globe, Paperclip, Type, Users } from 'lucide-react'
import { createContext, useContext } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ageTone, formatValue, timeSince } from '../lib/format'
import { ageFrom, relationLabel } from '../lib/family'
import { fieldText } from '../lib/localize'
import type { Card, Field } from '../lib/types'

/** Family members by holder id + how to open one (provided by the board) */
export const FamilyContext = createContext<{ members: Map<string, Card[]>; open: (c: Card) => void }>({ members: new Map(), open: () => {} })

const FIELD_ICON = { date: CalendarDays, attachment: Paperclip } as const

export function CardContent({ card, fields, isFinal, overlay }: { card: Card; fields: Field[]; isFinal?: boolean; overlay?: boolean }) {
  const { t, i18n } = useTranslation()
  const fam = useContext(FamilyContext)
  const members = fam.members.get(card.id) ?? []
  const isFamily = members.length > 0
  const dateField = fields.find((f) => f.per_person && f.type === 'date')
  const visible = fields.filter((f) => f.show_on_card && card.values[f.id] !== card.title).slice(0, 3)
  return (
    <div
      className={clsx(
        'rounded-xl border bg-white p-3.5 text-left',
        isFamily ? 'border-violet-200 border-l-4 border-l-violet-500' : 'border-slate-200',
        overlay ? 'rotate-[2deg] shadow-lift ring-2 ring-brand-300' : clsx('shadow-card transition hover:shadow-md', !isFamily && 'hover:border-slate-300'),
      )}
    >
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-[15px] font-semibold leading-snug text-slate-900">
          {card.title || '—'}
          {card.relation === 'contato' && <span className="ml-1.5 align-middle rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('family.contactOnly')}</span>}
        </h3>
        {isFamily && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700" title={t('family.section')}>
            <Users className="h-3 w-3" /> {members.length + (card.relation === 'contato' ? 0 : 1)}
          </span>
        )}
        {card.created_via === 'public_form' && (
          <span title={t('board.viaForm')}><Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /></span>
        )}
      </div>
      {visible.length > 0 && (
        <dl className="mt-2.5 space-y-2">
          {visible.map((f) => {
            const Icon = FIELD_ICON[f.type as keyof typeof FIELD_ICON] ?? Type
            return (
              <div key={f.id} className="flex gap-2">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{fieldText(f, i18n.language).label}</dt>
                  <dd className="truncate text-sm text-slate-700">{formatValue(f, card.values[f.id] ?? null, i18n.language)}</dd>
                </div>
              </div>
            )
          })}
        </dl>
      )}
      {isFamily && (
        <ul className="mt-3 space-y-1 border-t border-violet-100 pt-2">
          {members.map((m) => {
            const age = dateField ? ageFrom(m.values[dateField.id]) : null
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); fam.open(m) }}
                  className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-violet-50"
                >
                  <span className="shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 group-hover:bg-white">{relationLabel(m.relation ?? 'outro', t)}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700">{m.title}</span>
                  {age !== null && <span className="shrink-0 text-xs text-slate-400">{t('family.years', { count: age })}</span>}
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-violet-600" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!isFinal && (
        <div className="mt-3 flex">
          <span className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', ageTone(card.phase_entered_at))}>
            <Clock className="h-3 w-3" />
            {timeSince(card.phase_entered_at, i18n.language)}
          </span>
        </div>
      )}
    </div>
  )
}

export function CardTile({ card, fields, isFinal, onOpen }: { card: Card; fields: Field[]; isFinal: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', phaseId: card.phase_id },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx('touch-manipulation', isDragging && 'opacity-30')}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
        else listeners?.onKeyDown?.(e)
      }}
    >
      <CardContent card={card} fields={fields} isFinal={isFinal} />
    </div>
  )
}
