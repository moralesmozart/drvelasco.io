import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, FileSpreadsheet, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Header, PipeIcon } from '../components/Layout'
import { Button, Spinner, Toggle } from '../components/ui'
import { fieldText, phaseLabel } from '../lib/localize'
import { repo } from '../lib/repo'
import type { Board, Field, FieldValue } from '../lib/types'

type Cell = string | number | boolean | Date | null
type Target = '' | 'title' | 'phase' | 'created' | `field:${string}`

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function similar(a: string, b: string) {
  if (!a || !b) return false
  if (a === b) return true
  const [s, l] = a.length < b.length ? [a, b] : [b, a]
  return l.includes(s) && s.length / l.length > 0.6
}

/* ───────── value conversion ───────── */
const pad = (n: number) => String(n).padStart(2, '0')
function toIsoDate(v: Cell, withTime = false): string | null {
  if (v === null || v === '') return null
  let d: Date | null = null
  if (v instanceof Date) d = v
  else if (typeof v === 'number' && v > 20000 && v < 80000) d = new Date(Math.round((v - 25569) * 86400000)) // Excel serial
  else {
    const s = String(v).trim()
    let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s)
    if (m) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0))
    m = m ? null : /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s)
    if (m) d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0))
  }
  if (!d || isNaN(d.getTime())) return null
  return withTime ? d.toISOString() : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function matchOption(f: Field, raw: string) {
  const n = norm(raw)
  const i = f.options.findIndex((o, idx) => norm(o) === n || norm(f.translations?.es?.options?.[idx]) === n)
  return i >= 0 ? f.options[i] : raw.trim()
}

function convert(f: Field, v: Cell): FieldValue {
  if (v === null || v === undefined || String(v).trim() === '') return null
  switch (f.type) {
    case 'date': return toIsoDate(v)
    case 'number':
    case 'currency': {
      const n = parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
      return isNaN(n) ? null : n
    }
    case 'checklist': return String(v).split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => matchOption(f, x))
    case 'radio':
    case 'select': return matchOption(f, String(v))
    case 'phone': {
      const s = String(v).trim()
      return s.startsWith('+') ? s : s.replace(/\D/g, '')
    }
    default: return v instanceof Date ? toIsoDate(v) : String(v).trim()
  }
}

async function readFile(file: File): Promise<Cell[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    return (await readSheet(file)) as Cell[][]
  }
  const Papa = (await import('papaparse')).default
  const text = await file.text()
  const res = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
  return res.data as Cell[][]
}

export default function Importer() {
  const { pipeId = '' } = useParams()
  const { t } = useTranslation()
  const board = useQuery({ queryKey: ['board', pipeId], queryFn: () => repo.getBoard(pipeId) })
  if (board.isLoading || !board.data) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        left={
          <div className="flex min-w-0 items-center gap-2">
            <Link to={`/pipe/${pipeId}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('common.back')}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <PipeIcon name={board.data.pipe.icon} color={board.data.pipe.color} size="sm" />
            <h1 className="truncate text-lg font-semibold">{board.data.pipe.name}</h1>
            <span className="text-slate-300">/</span>
            <span className="truncate text-slate-600">{t('importer.title')}</span>
          </div>
        }
      />
      <ImporterBody board={board.data} />
    </div>
  )
}

function ImporterBody({ board }: { board: Board }) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const lang = i18n.language
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [header, setHeader] = useState<string[]>([])
  const [rows, setRows] = useState<Cell[][]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [phaseMap, setPhaseMap] = useState<Record<string, string>>({})
  const [defaultPhase, setDefaultPhase] = useState(board.phases[0]?.id ?? '')
  const [skipDupes, setSkipDupes] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  const fields = board.fields.filter((f) => f.type !== 'info' && f.type !== 'attachment')

  async function onFile(file: File) {
    try {
      const data = (await readFile(file)).filter((r) => r.some((c) => c !== null && String(c).trim() !== ''))
      if (data.length < 2) throw new Error('empty')
      const head = data[0].map((c) => String(c ?? '').trim())
      setFileName(file.name)
      setHeader(head)
      setRows(data.slice(1))
      const used = new Set<string>()
      setTargets(head.map((h) => {
        const n = norm(h)
        if (['titulo', 'title', 'nome do card', 'card'].includes(n)) return 'title'
        if (['fase', 'fase atual', 'phase', 'current phase', 'etapa'].includes(n)) return 'phase'
        if (['criado em', 'created at', 'data de criacao', 'creation date', 'criado'].includes(n)) return 'created'
        const f = fields.find((x) => !used.has(x.id) && (similar(n, norm(x.label)) || similar(n, norm(x.translations?.es?.label))))
        if (f) { used.add(f.id); return `field:${f.id}` as Target }
        return ''
      }))
    } catch {
      toast.error(t('importer.readError'))
    }
  }

  const phaseCol = targets.indexOf('phase')
  const phaseValues = useMemo(
    () => (phaseCol < 0 ? [] : [...new Set(rows.map((r) => String(r[phaseCol] ?? '').trim()).filter(Boolean))]),
    [rows, phaseCol],
  )
  // auto-match phase names once values are known
  const resolvedPhaseMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const v of phaseValues) {
      const auto = board.phases.find((p) => norm(p.name) === norm(v) || norm(p.translations?.es?.name) === norm(v))
      m[v] = phaseMap[v] ?? auto?.id ?? defaultPhase
    }
    return m
  }, [phaseValues, phaseMap, board.phases, defaultPhase])

  const existing = useMemo(() => new Set(board.cards.map((c) => norm(c.title))), [board.cards])

  const prepared = useMemo(() => {
    const out: Array<{ phase_id: string; title: string; values: Record<string, FieldValue>; created_at?: string }> = []
    for (const r of rows) {
      const values: Record<string, FieldValue> = {}
      let title = ''
      let phase = defaultPhase
      let created: string | undefined
      targets.forEach((tg, i) => {
        const cell = r[i] ?? null
        if (tg === 'title') title = String(cell ?? '').trim()
        else if (tg === 'phase') { const v = String(cell ?? '').trim(); if (v) phase = resolvedPhaseMap[v] ?? defaultPhase }
        else if (tg === 'created') created = toIsoDate(cell, true) ?? undefined
        else if (tg.startsWith('field:')) {
          const f = board.fields.find((x) => x.id === tg.slice(6))
          const v = f ? convert(f, cell) : null
          if (f && v !== null && !(Array.isArray(v) && !v.length)) values[f.id] = v
        }
      })
      if (!title) {
        const first = board.fields.filter((f) => f.phase_id === null && f.type === 'short_text').sort((a, b) => a.position - b.position)[0]
        title = first && typeof values[first.id] === 'string' ? String(values[first.id]) : ''
      }
      if (!title && !Object.keys(values).length) continue
      if (skipDupes && title && existing.has(norm(title))) continue
      out.push({ phase_id: phase, title: title || 'Card', values, created_at: created })
    }
    return out
  }, [rows, targets, resolvedPhaseMap, defaultPhase, skipDupes, existing, board.fields])

  async function runImport() {
    setBusy(true)
    try {
      const n = await repo.importCards(board.pipe.id, prepared)
      setDone(n)
      qc.invalidateQueries({ queryKey: ['board', board.pipe.id] })
    } catch {
      toast.error(t('common.error'))
    } finally { setBusy(false) }
  }

  if (done !== null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        </motion.div>
        <h2 className="mt-4 text-xl font-semibold">{t('importer.done', { count: done })}</h2>
        <Button className="mt-6" onClick={() => navigate(`/pipe/${board.pipe.id}`)}>{t('importer.back')}</Button>
      </div>
    )
  }

  const targetOptions = (
    <>
      <option value="">{t('importer.ignore')}</option>
      <option value="title">{t('importer.titleCol')}</option>
      <option value="phase">{t('importer.phaseCol')}</option>
      <option value="created">{t('importer.createdCol')}</option>
      <optgroup label={t('builder.startForm')}>
        {fields.filter((f) => f.phase_id === null).map((f) => <option key={f.id} value={`field:${f.id}`}>{fieldText(f, lang).label}</option>)}
      </optgroup>
      {board.phases.filter((p) => fields.some((f) => f.phase_id === p.id)).map((p) => (
        <optgroup key={p.id} label={phaseLabel(p, lang)}>
          {fields.filter((f) => f.phase_id === p.id).map((f) => <option key={f.id} value={`field:${f.id}`}>{fieldText(f, lang).label}</option>)}
        </optgroup>
      ))}
    </>
  )

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200/60">
        <h2 className="flex items-center gap-2 font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs text-white">1</span> {t('importer.step1')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('importer.step1Hint')}</p>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void onFile(f) }}
          className="mt-4 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center"
        >
          <FileSpreadsheet className="h-8 w-8 text-slate-400" />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> {t('importer.choose')}</Button>
          <p className="text-xs text-slate-400">CSV · XLSX</p>
          {fileName && <p className="text-sm font-medium text-slate-700">{fileName} · {t('importer.rows', { count: rows.length })}</p>}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = '' }} />
        </div>
      </section>

      {header.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200/60">
          <h2 className="flex items-center gap-2 font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs text-white">2</span> {t('importer.step2')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('importer.step2Hint')}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3 font-medium">{t('importer.column')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('importer.example')}</th>
                  <th className="pb-2 font-medium">{t('importer.target')}</th>
                </tr>
              </thead>
              <tbody>
                {header.map((h, i) => {
                  const sample = rows.find((r) => r[i] !== null && String(r[i]).trim() !== '')?.[i]
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-700">{h || `#${i + 1}`}</td>
                      <td className="max-w-[200px] truncate py-2 pr-3 text-slate-500">{sample instanceof Date ? sample.toLocaleDateString(lang) : String(sample ?? '—')}</td>
                      <td className="py-2">
                        <select
                          value={targets[i] ?? ''}
                          onChange={(e) => setTargets((ts) => ts.map((x, j) => (j === i ? (e.target.value as Target) : x)))}
                          className={`h-9 w-full rounded-lg border px-2 text-sm ${targets[i] ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white text-slate-500'}`}
                        >
                          {targetOptions}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('importer.defaultPhase')}</label>
              <select value={defaultPhase} onChange={(e) => setDefaultPhase(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm">
                {board.phases.map((p) => <option key={p.id} value={p.id}>{phaseLabel(p, lang)}</option>)}
              </select>
            </div>
            <div className="flex items-end"><Toggle checked={skipDupes} onChange={setSkipDupes} label={t('importer.skipDupes')} /></div>
          </div>

          {phaseValues.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-slate-700">{t('importer.phaseMap')}</p>
              <p className="text-xs text-slate-500">{t('importer.phaseMapHint')}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {phaseValues.map((v) => (
                  <label key={v} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{v}</span>
                    <span className="text-slate-300">→</span>
                    <select value={resolvedPhaseMap[v]} onChange={(e) => setPhaseMap((m) => ({ ...m, [v]: e.target.value }))} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm">
                      {board.phases.map((p) => <option key={p.id} value={p.id}>{phaseLabel(p, lang)}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
            <Button onClick={runImport} loading={busy} disabled={!prepared.length}>
              <Upload className="h-4 w-4" /> {t('importer.import', { count: prepared.length })}
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}
