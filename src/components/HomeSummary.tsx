import { useQueries, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity, CalendarClock, CalendarDays, ChevronRight, HeartPulse, History, Pill, Settings2, Sparkles, Stethoscope, Syringe,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../lib/auth'
import { lastVisitSince } from '../lib/lastVisit'
import { fieldText, phaseLabel } from '../lib/localize'
import { repo } from '../lib/repo'
import type { Board, Card, Field, FormSettings, PipeSummary } from '../lib/types'
import { Button, Label, Modal } from './ui'

const DAY = 86400000
const BUBBLES: Array<{ icon: LucideIcon; cls: string; delay: number }> = [
  { icon: HeartPulse, cls: 'right-[34%] top-5 bg-rose-50 text-rose-500', delay: 0 },
  { icon: Syringe, cls: 'right-[18%] top-12 bg-sky-50 text-sky-600', delay: 0.8 },
  { icon: Pill, cls: 'right-[26%] bottom-6 bg-violet-50 text-violet-600', delay: 1.4 },
  { icon: Activity, cls: 'right-8 bottom-10 bg-emerald-50 text-emerald-600', delay: 0.4 },
  { icon: Stethoscope, cls: 'right-10 top-6 bg-white text-care-700', delay: 1.1 },
]

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Days from today to an ISO date (YYYY-MM-DD); negative = in the past. */
function daysUntil(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d).getTime() - startOfDay(new Date())) / DAY)
}

export function HomeSummary({ pipes }: { pipes: PipeSummary[] }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.language
  const boards = useQueries({ queries: pipes.map((p) => ({ queryKey: ['board', p.id], queryFn: () => repo.getBoard(p.id) })) })
  const loaded = boards.map((b) => b.data).filter((b): b is Board => !!b)
  const [since] = useState(() => (user ? lastVisitSince(user.id) : Date.now()))

  const allCards = loaded.flatMap((b) => b.cards.map((c) => ({ card: c, board: b })))
  const today = startOfDay(new Date())
  const newToday = allCards.filter(({ card }) => new Date(card.created_at).getTime() >= today)
  const newSince = allCards.filter(({ card }) => new Date(card.created_at).getTime() >= since)
  const hour = new Date().getHours()
  const greet = hour < 12 ? t('summary.morning') : hour < 19 ? t('summary.afternoon') : t('summary.evening')
  const single = loaded.length === 1 ? loaded[0].pipe.id : null

  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl bg-care-700 px-6 py-7 text-white shadow-lift sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-care-500/50" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-care-600" />
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
          {BUBBLES.map((b, i) => (
            <motion.span
              key={i}
              className={clsx('absolute grid h-11 w-11 place-items-center rounded-full shadow-lg ring-4 ring-white/15', b.cls)}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
              transition={{ opacity: { delay: 0.2 + i * 0.1 }, scale: { delay: 0.2 + i * 0.1, type: 'spring' }, y: { delay: b.delay, duration: 4.5, repeat: Infinity, ease: 'easeInOut' } }}
            >
              <b.icon className="h-5 w-5" />
            </motion.span>
          ))}
        </div>
        <div className="relative max-w-xl">
          <p className="text-sm text-care-100">{new Date().toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {greet}, {user?.name.split(' ')[0]}
          </motion.h1>
          <p className="mt-1 text-care-100">{t('summary.subtitle')}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <Kpi to={single ? `/pipe/${single}` : undefined} icon={Sparkles} value={newToday.length} label={t('summary.today')} delay={0.1} />
            <Kpi
              to={single ? `/pipe/${single}` : undefined}
              icon={History}
              value={newSince.length}
              label={t('summary.sinceLast')}
              hint={t('summary.lastVisit', { when: new Date(since).toLocaleString(lang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) })}
              delay={0.18}
            />
          </div>
        </div>
      </section>

      {loaded.map((b) => <Upcoming key={b.pipe.id} board={b} />)}
    </div>
  )
}

function Kpi({ icon: Icon, value, label, hint, to, delay }: { icon: LucideIcon; value: number; label: string; hint?: string; to?: string; delay: number }) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="h-full rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-care-100"><Icon className="h-4 w-4" /> {label}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-care-200">{hint}</p>}
    </motion.div>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}

/* ───────── Upcoming dates for one pipe ───────── */

function defaults(board: Board) {
  const dates = board.fields.filter((f) => f.type === 'date')
  const s = (board.pipe.form_settings as FormSettings).dashboard ?? {}
  const field = dates.find((f) => f.id === s.date_field_id) ?? dates.find((f) => f.show_on_card) ?? dates[0]
  const phaseIds = s.phase_ids?.length ? s.phase_ids : board.phases.filter((p) => !p.is_final).map((p) => p.id)
  return { dates, field, phaseIds, days: s.days ?? 7 }
}

function Upcoming({ board }: { board: Board }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [configuring, setConfiguring] = useState(false)
  const { dates, field, phaseIds, days } = defaults(board)

  const items = useMemo(() => {
    if (!field) return []
    return board.cards
      .filter((c) => phaseIds.includes(c.phase_id))
      .map((c) => ({ card: c, value: c.values[field.id] }))
      .filter((x): x is { card: Card; value: string } => typeof x.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.value))
      .map((x) => ({ ...x, diff: daysUntil(x.value) }))
      .filter((x) => x.diff <= days)
      .sort((a, b) => a.diff - b.diff)
  }, [board, field, phaseIds, days])

  if (!dates.length || !field) return null
  const shown = items.slice(0, 6)

  const badge = (diff: number) => {
    if (diff < 0) return { text: t('summary.ago', { count: -diff }), cls: 'bg-rose-100 text-rose-700' }
    if (diff === 0) return { text: t('summary.todayBadge'), cls: 'bg-amber-100 text-amber-800' }
    if (diff === 1) return { text: t('summary.tomorrow'), cls: 'bg-amber-50 text-amber-700' }
    return { text: t('summary.inDays', { count: diff }), cls: 'bg-care-50 text-care-700' }
  }

  return (
    <section>
      <div className="mb-3 flex items-end gap-2">
        <div className="mr-auto min-w-0">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><CalendarClock className="h-5 w-5 text-care-600" /> {t('summary.upcoming')}</h2>
          <p className="truncate text-sm text-slate-500">{fieldText(field, lang).label} · {board.pipe.name} · {t('summary.nextDays', { count: days })}</p>
        </div>
        <button onClick={() => setConfiguring(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('summary.configure')}</span>
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">{t('summary.none', { count: days })}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ card, value, diff }, i) => {
            const b = badge(diff)
            const phase = board.phases.find((p) => p.id === card.phase_id)
            const [y, m, d] = value.split('-').map(Number)
            return (
              <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                <Link
                  to={`/pipe/${board.pipe.id}?card=${card.id}`}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className={clsx('grid h-14 w-14 shrink-0 place-items-center rounded-xl text-center leading-none', diff < 0 ? 'bg-rose-50 text-rose-700' : diff <= 1 ? 'bg-amber-50 text-amber-800' : 'bg-care-50 text-care-700')}>
                    <span>
                      <span className="block text-xl font-bold tabular-nums">{d}</span>
                      <span className="block text-[10px] font-semibold uppercase">{new Date(y, m - 1, d).toLocaleDateString(lang, { month: 'short' }).replace('.', '')}</span>
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{card.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={clsx('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', b.cls)}>{b.text}</span>
                      {phase && <span className="truncate text-xs" style={{ color: phase.color }}>{phaseLabel(phase, lang)}</span>}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
      {items.length > shown.length && <p className="mt-2 text-right text-xs text-slate-500">{t('summary.more', { count: items.length - shown.length })}</p>}

      <ConfigDialog open={configuring} onClose={() => setConfiguring(false)} board={board} dates={dates} initial={{ field, phaseIds, days }} />
    </section>
  )
}

function ConfigDialog({ open, onClose, board, dates, initial }: {
  open: boolean; onClose: () => void; board: Board; dates: Field[]; initial: { field: Field; phaseIds: string[]; days: number }
}) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [fieldId, setFieldId] = useState(initial.field.id)
  const [phaseIds, setPhaseIds] = useState(initial.phaseIds)
  const [days, setDays] = useState(initial.days)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setFieldId(initial.field.id); setPhaseIds(initial.phaseIds); setDays(initial.days) } }

  async function save() {
    setBusy(true)
    try {
      const settings = { ...(board.pipe.form_settings as FormSettings), dashboard: { date_field_id: fieldId, phase_ids: phaseIds, days } }
      await repo.updateFormSettings(board.pipe.id, settings)
      await qc.invalidateQueries({ queryKey: ['board', board.pipe.id] })
      onClose()
    } catch { toast.error(t('common.error')) } finally { setBusy(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('summary.configure')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button loading={busy} onClick={save} disabled={!phaseIds.length}>{t('common.save')}</Button></>}
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor="dash-field">{t('summary.dateField')}</Label>
          <select id="dash-field" value={fieldId} onChange={(e) => setFieldId(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
            {dates.map((f) => <option key={f.id} value={f.id}>{fieldText(f, i18n.language).label}</option>)}
          </select>
        </div>
        <div>
          <Label>{t('summary.phases')}</Label>
          <div className="space-y-1.5">
            {board.phases.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#25775f]"
                  checked={phaseIds.includes(p.id)}
                  onChange={(e) => setPhaseIds((ids) => (e.target.checked ? [...ids, p.id] : ids.filter((x) => x !== p.id)))}
                />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                {phaseLabel(p, i18n.language)}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>{t('summary.horizon')}</Label>
          <div className="flex flex-wrap gap-2">
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={clsx('rounded-full px-3 py-1.5 text-sm font-medium', days === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
              >
                {t('summary.nextDays', { count: d })}
              </button>
            ))}
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs text-slate-500"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('summary.configHint')}</p>
      </div>
    </Modal>
  )
}
