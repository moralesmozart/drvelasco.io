import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, Clock, Globe, Paperclip, Type } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ageTone, formatValue, timeSince } from '../lib/format'
import { fieldText } from '../lib/localize'
import type { Card, Field } from '../lib/types'

const FIELD_ICON = { date: CalendarDays, attachment: Paperclip } as const

export function CardContent({ card, fields, isFinal, overlay }: { card: Card; fields: Field[]; isFinal?: boolean; overlay?: boolean }) {
  const { t, i18n } = useTranslation()
  const visible = fields.filter((f) => f.show_on_card && card.values[f.id] !== card.title).slice(0, 3)
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white p-3.5 text-left',
        overlay ? 'rotate-[2deg] shadow-lift ring-2 ring-brand-300' : 'shadow-card transition hover:border-slate-300 hover:shadow-md',
      )}
    >
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-[15px] font-semibold leading-snug text-slate-900">{card.title || '—'}</h3>
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
