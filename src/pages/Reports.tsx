import { currencyOf } from '../lib/format'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, Clock, Inbox, Sparkles, Table2, BarChart3 } from 'lucide-react'
import clsx from 'clsx'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Header, PipeIcon } from '../components/Layout'
import { Spinner } from '../components/ui'
import { fieldText, phaseLabel } from '../lib/localize'
import { repo } from '../lib/repo'
import type { Board, CardEvent } from '../lib/types'

const DAY = 86400000
type Period = '30' | '90' | '365' | 'all'

export default function Reports() {
  const { pipeId = '' } = useParams()
  const { t, i18n } = useTranslation()
  const board = useQuery({ queryKey: ['board', pipeId], queryFn: () => repo.getBoard(pipeId) })
  const events = useQuery({ queryKey: ['pipe-events', pipeId], queryFn: () => repo.listPipeEvents(pipeId) })
  const [period, setPeriod] = useState<Period>('90')

  if (board.isLoading || events.isLoading || !board.data) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  const b = board.data

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        left={
          <div className="flex min-w-0 items-center gap-2">
            <Link to={`/pipe/${pipeId}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('common.back')}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <PipeIcon name={b.pipe.icon} color={b.pipe.color} size="sm" />
            <h1 className="truncate text-lg font-semibold">{b.pipe.name}</h1>
            <span className="text-slate-300">/</span>
            <span className="truncate text-slate-600">{t('reports.title')}</span>
          </div>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label={t('reports.period')}>
          {(['30', '90', '365', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx('rounded-full px-3.5 py-1.5 text-sm font-medium transition', period === p ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100')}
            >
              {t(`reports.p${p}`)}
            </button>
          ))}
        </div>
        <ReportBody board={b} events={events.data ?? []} period={period} lang={i18n.language} />
      </main>
    </div>
  )
}

function ReportBody({ board: fullBoard, events: allEvents, period, lang }: { board: Board; events: CardEvent[]; period: Period; lang: string }) {
  const { t } = useTranslation()
  // A family request counts once (its holder); members ride along
  const board = { ...fullBoard, cards: fullBoard.cards.filter((c) => !c.family_of) }
  const holderIds = new Set(board.cards.map((c) => c.id))
  const events = allEvents.filter((e) => holderIds.has(e.card_id))
  const now = Date.now()
  const since = period === 'all' ? 0 : now - Number(period) * DAY
  const finals = new Set(board.phases.filter((p) => p.is_final).map((p) => p.id))
  const inPeriod = board.cards.filter((c) => new Date(c.created_at).getTime() >= since)

  const stats = useMemo(() => {
    const byCard = new Map<string, CardEvent[]>()
    for (const e of events) (byCard.get(e.card_id) ?? byCard.set(e.card_id, []).get(e.card_id)!).push(e)

    // time spent in each phase (completed stays only) + time to completion
    const phaseDur = new Map<string, number[]>()
    const toDone: number[] = []
    let completed = 0
    for (const c of board.cards) {
      const moves = (byCard.get(c.id) ?? []).filter((e) => e.type === 'moved').sort((a, b) => a.created_at.localeCompare(b.created_at))
      let at = new Date(c.created_at).getTime()
      let reachedFinal: number | null = null
      for (const m of moves) {
        const tm = new Date(m.created_at).getTime()
        const from = String(m.payload.from)
        if (tm >= since) (phaseDur.get(from) ?? phaseDur.set(from, []).get(from)!).push(tm - at)
        at = tm
        if (finals.has(String(m.payload.to)) && reachedFinal === null) reachedFinal = tm
      }
      if (reachedFinal !== null && reachedFinal >= since) {
        completed++
        toDone.push(reachedFinal - new Date(c.created_at).getTime())
      }
    }
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
    return { phaseDur, completed, avgDone: avg(toDone), avg }
  }, [board, events, since]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = board.cards.filter((c) => !finals.has(c.phase_id)).length
  const days = (ms: number | null) => (ms === null ? '—' : new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(ms / DAY))

  // weekly new requests (last 12 weeks, independent of the period filter)
  const weeks = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7 * 11)
    return Array.from({ length: 12 }, (_, i) => {
      const from = start.getTime() + i * 7 * DAY
      const to = from + 7 * DAY
      return {
        label: new Date(from).toLocaleDateString(lang, { day: '2-digit', month: '2-digit' }),
        value: board.cards.filter((c) => { const x = new Date(c.created_at).getTime(); return x >= from && x < to }).length,
      }
    })
  }, [board, lang])

  const perPhase = board.phases.map((p) => ({ label: phaseLabel(p, lang), value: board.cards.filter((c) => c.phase_id === p.id).length }))
  const phaseTimes = board.phases
    .filter((p) => !p.is_final)
    .map((p) => { const a = stats.avg(stats.phaseDur.get(p.id) ?? []); return { label: phaseLabel(p, lang), value: a === null ? 0 : a / DAY, empty: a === null } })

  // breakdown by a choice field, and money by option
  const choiceFields = board.fields.filter((f) => ['radio', 'select', 'checklist'].includes(f.type) && f.options.length)
  const moneyFields = board.fields.filter((f) => f.type === 'currency' || f.type === 'number')
  const [choiceId, setChoiceId] = useState<string>(() => choiceFields.find((f) => f.phase_id !== null)?.id ?? choiceFields[0]?.id ?? '')
  const [moneyId, setMoneyId] = useState<string>(() => moneyFields.find((f) => f.type === 'currency')?.id ?? moneyFields[0]?.id ?? '')
  const choice = board.fields.find((f) => f.id === choiceId)
  const money = board.fields.find((f) => f.id === moneyId)
  const breakdown = choice ? choice.options.map((o) => {
    const matching = inPeriod.filter((c) => { const v = c.values[choice.id]; return Array.isArray(v) ? (v as string[]).includes(o) : v === o })
    const byCur: Record<string, number> = {}
    let sum = 0
    if (money) for (const c of matching) {
      const n = Number(c.values[money.id]) || 0
      if (!n) continue
      sum += n
      const cur = money.type === 'currency' ? currencyOf(money, c.values) : ''
      byCur[cur] = (byCur[cur] ?? 0) + n
    }
    return { label: fieldText(choice, lang).option(o), count: matching.length, sum, byCur }
  }) : []
  const moneyFmt = (byCur: Record<string, number>) => {
    const parts = Object.entries(byCur).map(([cur, n]) => cur ? new Intl.NumberFormat(lang, { style: 'currency', currency: cur }).format(n) : new Intl.NumberFormat(lang).format(n))
    return parts.length ? parts.join(' + ') : new Intl.NumberFormat(lang).format(0)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Sparkles className="h-4 w-4" />} label={t('reports.newRequests')} value={String(inPeriod.length)} hint={t(`reports.p${period}`)} />
        <Kpi icon={<Inbox className="h-4 w-4" />} label={t('reports.open')} value={String(open)} hint={t('reports.now')} />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label={t('reports.completed')} value={String(stats.completed)} hint={t(`reports.p${period}`)} />
        <Kpi icon={<Clock className="h-4 w-4" />} label={t('reports.avgToDone')} value={days(stats.avgDone)} unit={t('reports.days')} hint={t(`reports.p${period}`)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('reports.weekly')} subtitle={t('reports.weeklyHint')} rows={weeks.map((w) => ({ label: w.label, value: w.value, display: String(w.value) }))}>
          <VBars rows={weeks} />
        </ChartCard>
        <ChartCard title={t('reports.perPhase')} subtitle={t('reports.now')} rows={perPhase.map((r) => ({ ...r, display: String(r.value) }))}>
          <HBars rows={perPhase.map((r) => ({ ...r, display: String(r.value) }))} />
        </ChartCard>
        <ChartCard title={t('reports.timeInPhase')} subtitle={t('reports.timeInPhaseHint')} rows={phaseTimes.map((r) => ({ ...r, display: r.empty ? '—' : `${days(r.value * DAY)} ${t('reports.days')}` }))}>
          <HBars rows={phaseTimes.map((r) => ({ ...r, display: r.empty ? '—' : `${days(r.value * DAY)} ${t('reports.days')}` }))} />
        </ChartCard>
        {choice && (
          <ChartCard
            title={t('reports.breakdown')}
            subtitle={t(`reports.p${period}`)}
            controls={
              <select value={choiceId} onChange={(e) => setChoiceId(e.target.value)} className="h-8 max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 text-sm">
                {choiceFields.map((f) => <option key={f.id} value={f.id}>{fieldText(f, lang).label}</option>)}
              </select>
            }
            rows={breakdown.map((r) => ({ label: r.label, value: r.count, display: String(r.count) }))}
          >
            <HBars rows={breakdown.map((r) => ({ label: r.label, value: r.count, display: String(r.count) }))} />
          </ChartCard>
        )}
        {choice && money && (
          <ChartCard
            title={t('reports.sumBy', { field: fieldText(money, lang).label })}
            subtitle={`${fieldText(choice, lang).label} · ${t(`reports.p${period}`)}`}
            controls={
              <select value={moneyId} onChange={(e) => setMoneyId(e.target.value)} className="h-8 max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 text-sm">
                {moneyFields.map((f) => <option key={f.id} value={f.id}>{fieldText(f, lang).label}</option>)}
              </select>
            }
            rows={breakdown.map((r) => ({ label: r.label, value: r.sum, display: moneyFmt(r.byCur) }))}
          >
            <HBars rows={breakdown.map((r) => ({ label: r.label, value: r.sum, display: moneyFmt(r.byCur) }))} />
          </ChartCard>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, unit, hint }: { icon: ReactNode; label: string; value: string; unit?: string; hint: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200/60">
      <p className="flex items-center gap-1.5 text-sm text-slate-500"><span className="text-brand-600">{icon}</span>{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}{unit && <span className="ml-1 text-base font-medium text-slate-500">{unit}</span>}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </motion.div>
  )
}

function ChartCard({ title, subtitle, controls, rows, children }: {
  title: string; subtitle?: string; controls?: ReactNode; rows: Array<{ label: string; display: string }>; children: ReactNode
}) {
  const { t } = useTranslation()
  const [table, setTable] = useState(false)
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200/60">
      <div className="mb-4 flex flex-wrap items-start gap-2">
        <div className="mr-auto min-w-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {controls}
        <button
          onClick={() => setTable((x) => !x)}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          title={table ? t('reports.chart') : t('reports.table')}
          aria-label={table ? t('reports.chart') : t('reports.table')}
        >
          {table ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
        </button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1.5 pr-3 text-slate-600">{r.label}</td>
                <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">{r.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : children}
    </section>
  )
}

/** Horizontal bars: single series, one hue, value label at the end of each bar. */
function HBars({ rows }: { rows: Array<{ label: string; value: number; display: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i} className="group grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm" title={`${r.label}: ${r.display}`}>
          <span className="truncate text-slate-600">{r.label}</span>
          <span className="flex items-center gap-2">
            <motion.span
              className="h-5 rounded-r bg-brand-500 transition group-hover:bg-brand-600"
              style={{ minWidth: r.value > 0 ? 4 : 0 }}
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 85}%` }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
            />
            <span className="shrink-0 font-medium tabular-nums text-slate-700">{r.display}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Vertical bars for a time series with a hover tooltip. */
function VBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...rows.map((r) => r.value))
  const ticks = [0, Math.ceil(max / 2), max]
  return (
    <div className="relative">
      <div className="flex h-44 items-end gap-1.5 border-b border-slate-200 pl-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex h-44 flex-col-reverse justify-between text-[10px] tabular-nums text-slate-400">
          {ticks.map((tk) => <span key={tk}>{tk}</span>)}
        </div>
        {rows.map((r, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${r.label}: ${r.value}`}
            className="relative flex h-full flex-1 items-end justify-center focus:outline-none"
          >
            <motion.span
              className={clsx('w-full max-w-8 rounded-t', hover === i ? 'bg-brand-700' : 'bg-brand-500')}
              initial={{ height: 0 }}
              animate={{ height: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
              style={{ minHeight: r.value > 0 ? 4 : 0 }}
            />
            {hover === i && (
              <span className="absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white shadow-lg">
                {r.label}: <b>{r.value}</b>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 pl-6 text-[10px] text-slate-400">
        {rows.map((r, i) => <span key={i} className="flex-1 truncate text-center">{i % 2 === 0 ? r.label : ''}</span>)}
      </div>
    </div>
  )
}
