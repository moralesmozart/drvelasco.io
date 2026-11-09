import { currencyOf, currencySymbol } from '../lib/format'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Copy, ExternalLink, FileText, Image as ImageIcon, Loader2, MessageCircle, Paperclip, X } from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AttachmentValue, Field, FieldValue } from '../lib/types'
import { compressImage } from './compress'
import { COUNTRIES, flag, parsePhone, whatsappLink } from './countries'
import { fieldText, isEs } from '../lib/localize'

const inputCls =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4'
const okCls = 'border-slate-200 focus:border-brand-400 focus:ring-brand-100'
const errCls = 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf'

interface Props {
  field: Field
  value: FieldValue | undefined
  onChange: (v: FieldValue) => void
  error?: string
  onUpload?: (file: File) => Promise<AttachmentValue>
  onOpenFile?: (file: AttachmentValue) => void
  /** Internal views: show a WhatsApp shortcut under phone fields. */
  showWhatsApp?: boolean
  /** Keeps ids unique when the same field is shown more than once (family members) */
  idPrefix?: string
  /** Other answers on the same card (a money field's currency may depend on them) */
  values?: Record<string, FieldValue>
}

export function FieldInput({ field, value, onChange, error, onUpload, onOpenFile, showWhatsApp, idPrefix, values }: Props) {
  const { t, i18n } = useTranslation()
  const id = idPrefix ? `f-${idPrefix}-${field.id}` : `f-${field.id}`
  const txt = fieldText(field, i18n.language)
  const describedBy = [txt.description && `${id}-d`, error && `${id}-e`].filter(Boolean).join(' ') || undefined

  if (field.type === 'info') {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
        {txt.label && <p className="font-medium text-slate-800">{txt.label}</p>}
        {txt.description && <p className="mt-1 whitespace-pre-line">{txt.description}</p>}
      </div>
    )
  }

  const control = (() => {
    const common = { id, 'aria-invalid': !!error, 'aria-describedby': describedBy }
    const str = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    switch (field.type) {
      case 'long_text':
        return <textarea {...common} rows={4} value={str} onChange={(e) => onChange(e.target.value)} className={clsx(inputCls, 'py-2.5', error ? errCls : okCls)} />
      case 'date':
        return <DateParts id={id} value={str} onChange={onChange} hasError={!!error} labelledBy={`${id}-l`} />
      case 'number':
      case 'currency':
        return (
          <div className="relative">
            {field.type === 'currency' && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{currencySymbol(currencyOf(field, values), i18n.language)}</span>}
            <input
              {...common}
              type="number"
              inputMode="decimal"
              step="any"
              value={str}
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
              className={clsx(inputCls, 'h-12', field.type === 'currency' && (currencySymbol(currencyOf(field, values), i18n.language).length > 1 ? 'pl-11' : 'pl-8'), error ? errCls : okCls)}
            />
          </div>
        )
      case 'email':
        return <input {...common} type="email" autoComplete="email" value={str} onChange={(e) => onChange(e.target.value)} className={clsx(inputCls, 'h-12', error ? errCls : okCls)} />
      case 'phone':
        return (
          <>
            <PhoneInput id={id} value={str} onChange={onChange} hasError={!!error} describedBy={describedBy} />
            {showWhatsApp && <WhatsAppShortcut value={str} />}
          </>
        )
      case 'select':
        return (
          <select {...common} value={str} onChange={(e) => onChange(e.target.value || null)} className={clsx(inputCls, 'h-12', error ? errCls : okCls)}>
            <option value="">{t('forms.selectPlaceholder')}</option>
            {field.options.map((o) => <option key={o} value={o}>{txt.option(o)}</option>)}
          </select>
        )
      case 'radio':
        return (
          <div role="radiogroup" aria-labelledby={`${id}-l`} className="space-y-2">
            {field.options.map((o) => (
              <OptionRow key={o} label={txt.option(o)} checked={value === o} round onToggle={() => onChange(value === o ? null : o)} />
            ))}
          </div>
        )
      case 'checklist': {
        const arr = Array.isArray(value) ? (value as string[]) : []
        return (
          <div role="group" aria-labelledby={`${id}-l`} className="space-y-2">
            {field.options.map((o) => (
              <OptionRow
                key={o}
                label={txt.option(o)}
                checked={arr.includes(o)}
                onToggle={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}
              />
            ))}
          </div>
        )
      }
      case 'attachment':
        return <Uploader id={id} value={Array.isArray(value) ? (value as AttachmentValue[]) : []} onChange={onChange} onUpload={onUpload} onOpenFile={onOpenFile} hasError={!!error} />
      default:
        return <input {...common} type="text" value={str} onChange={(e) => onChange(e.target.value)} className={clsx(inputCls, 'h-12', error ? errCls : okCls)} />
    }
  })()

  return (
    <div>
      <label id={`${id}-l`} htmlFor={id} className="block text-[15px] font-medium leading-snug text-slate-900">
        {txt.label}
        {field.required && <span className="ml-0.5 text-rose-500" aria-hidden>*</span>}
      </label>
      {txt.description && <p id={`${id}-d`} className="mt-1 whitespace-pre-line text-sm text-slate-500">{txt.description}</p>}
      <div className="mt-2">{control}</div>
      <AnimatePresence>
        {error && (
          <motion.p id={`${id}-e`} role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 text-sm text-rose-600">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function OptionRow({ label, checked, onToggle, round }: { label: string; checked: boolean; onToggle: () => void; round?: boolean }) {
  return (
    <button
      type="button"
      role={round ? 'radio' : 'checkbox'}
      aria-checked={checked}
      onClick={onToggle}
      className={clsx(
        'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] transition',
        checked ? 'border-brand-400 bg-brand-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      <span
        className={clsx(
          'grid h-5 w-5 shrink-0 place-items-center border-2 transition',
          round ? 'rounded-full' : 'rounded-md',
          checked ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white',
        )}
      >
        {checked && (round ? <span className="h-2 w-2 rounded-full bg-white" /> : <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />)}
      </span>
      {label}
    </button>
  )
}

function fmtSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function Uploader({ id, value, onChange, onUpload, onOpenFile, hasError }: {
  id: string; value: AttachmentValue[]; onChange: (v: FieldValue) => void; onUpload?: (f: File) => Promise<AttachmentValue>
  onOpenFile?: (f: AttachmentValue) => void; hasError: boolean
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  async function add(files: FileList | null) {
    if (!files || !onUpload) return
    setProblem(null)
    let current = value
    for (const raw of Array.from(files)) {
      if (current.length >= 10) { setProblem(t('forms.tooManyFiles')); break }
      setBusy((b) => [...b, raw.name])
      try {
        const file = await compressImage(raw)
        if (file.size > MAX_BYTES) { setProblem(t('forms.fileTooBig', { name: raw.name })); continue }
        const uploaded = await onUpload(file)
        current = [...current, uploaded]
        onChange(current)
      } catch {
        setProblem(t('forms.uploadFailed', { name: raw.name }))
      } finally {
        setBusy((b) => b.filter((n) => n !== raw.name))
      }
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void add(e.dataTransfer.files) }}
        className={clsx(
          'flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
          drag ? 'border-brand-400 bg-brand-50' : hasError ? 'border-rose-300' : 'border-slate-200 hover:border-slate-300',
        )}
      >
        <Paperclip className="h-5 w-5 text-slate-400" />
        <button type="button" onClick={() => ref.current?.click()} className="text-[15px] font-medium text-brand-700 hover:underline">
          {t('forms.chooseFiles')}
        </button>
        <p className="text-xs text-slate-500">{t('forms.fileHint')}</p>
        <input id={id} ref={ref} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      </div>
      {(value.length > 0 || busy.length > 0) && (
        <ul className="mt-2 space-y-1.5">
          {value.map((a) => (
            <li key={a.path} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {a.mime.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-slate-400" /> : <FileText className="h-4 w-4 text-slate-400" />}
              {onOpenFile ? (
                <button type="button" onClick={() => onOpenFile(a)} className="min-w-0 flex-1 truncate text-left font-medium text-brand-700 hover:underline">{a.name}</button>
              ) : (
                <span className="min-w-0 flex-1 truncate text-slate-700">{a.name}</span>
              )}
              <span className="text-xs text-slate-400">{fmtSize(a.size)}</span>
              <button type="button" aria-label={t('common.delete')} onClick={() => onChange(value.filter((x) => x.path !== a.path))} className="text-slate-400 hover:text-rose-600">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
          {busy.map((n) => (
            <li key={n} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> <span className="truncate">{n}</span>
            </li>
          ))}
        </ul>
      )}
      {problem && <p className="mt-1.5 text-sm text-rose-600">{problem}</p>}
    </div>
  )
}

/* ───────── Phone with country picker ───────── */
function PhoneInput({ id, value, onChange, hasError, describedBy }: {
  id: string; value: string; onChange: (v: FieldValue) => void; hasError: boolean; describedBy?: string
}) {
  const { t, i18n } = useTranslation()
  const parsed = parsePhone(value)
  const [iso, setIso] = useState(parsed.iso)
  const country = COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0]
  const number = parsed.number

  const emit = (dial: string, digits: string) => onChange(digits ? `+${dial} ${digits}` : null)

  return (
    <div className={clsx('flex h-12 overflow-hidden rounded-xl border bg-white transition focus-within:ring-4', hasError ? 'border-rose-300 focus-within:ring-rose-100' : 'border-slate-200 focus-within:border-brand-400 focus-within:ring-brand-100')}>
      <div className="relative flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-slate-50 pl-3 pr-2 text-[15px] text-slate-700">
        <span className="text-xl leading-none" aria-hidden>{flag(country.iso)}</span>
        <span className="tabular-nums">+{country.dial}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
        <select
          aria-label={t('forms.country')}
          value={iso}
          onChange={(e) => {
            const c = COUNTRIES.find((x) => x.iso === e.target.value)!
            setIso(c.iso)
            emit(c.dial, number)
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {COUNTRIES.map((c, i) => (
            <option key={c.iso} value={c.iso}>
              {flag(c.iso)} {isEs(i18n.language) ? c.es : c.pt} (+{c.dial}){i === 2 ? ' ' : ''}
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-invalid={hasError}
        aria-describedby={describedBy}
        placeholder={country.iso === 'BR' ? '31 99999 8888' : country.iso === 'ES' ? '612 345 678' : '555 123 4567'}
        value={number}
        onChange={(e) => emit(country.dial, e.target.value.replace(/\D/g, '').slice(0, 15))}
        className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  )
}

function WhatsAppShortcut({ value }: { value: string }) {
  const { t } = useTranslation()
  const link = whatsappLink(value)
  if (!link) return null
  const short = link.replace('https://', '')
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm">
      <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
      <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">{t('card.whatsapp')}</span>
      <a href={link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-emerald-800 hover:underline">{short}</a>
      <button type="button" title={t('card.copy')} aria-label={t('card.copy')} onClick={() => navigator.clipboard.writeText(short)} className="text-emerald-600 hover:text-emerald-800">
        <Copy className="h-4 w-4" />
      </button>
      <a href={link} target="_blank" rel="noreferrer" title={t('card.openWhatsapp')} aria-label={t('card.openWhatsapp')} className="text-emerald-600 hover:text-emerald-800">
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  )
}

/* ───────── Date as day / month / year boxes ───────── */
function splitDate(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? { d: m[3], m: m[2], y: m[1] } : { d: '', m: '', y: '' }
}

function DateParts({ id, value, onChange, hasError, labelledBy }: {
  id: string; value: string; onChange: (v: FieldValue) => void; hasError: boolean; labelledBy: string
}) {
  const { t } = useTranslation()
  const [parts, setParts] = useState(() => splitDate(value))
  const [touched, setTouched] = useState(false)
  const refs = { d: useRef<HTMLInputElement>(null), m: useRef<HTMLInputElement>(null), y: useRef<HTMLInputElement>(null) }

  // External value changed (e.g. card switched): resync
  useEffect(() => {
    const cur = parts.y && parts.m && parts.d ? `${parts.y}-${parts.m.padStart(2, '0')}-${parts.d.padStart(2, '0')}` : ''
    if (value && value !== cur) setParts(splitDate(value))
    if (!value && cur) setParts({ d: '', m: '', y: '' })
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const complete = parts.d.length > 0 && parts.m.length > 0 && parts.y.length === 4
  const iso = complete ? `${parts.y}-${parts.m.padStart(2, '0')}-${parts.d.padStart(2, '0')}` : ''
  const valid = complete && (() => {
    const dt = new Date(`${iso}T00:00:00`)
    return !isNaN(dt.getTime()) && dt.getDate() === Number(parts.d) && dt.getMonth() + 1 === Number(parts.m) && Number(parts.y) >= 1900 && Number(parts.y) <= 2100
  })()
  const empty = !parts.d && !parts.m && !parts.y
  const problem = touched && !empty && (!complete ? t('forms.dateIncomplete') : !valid ? t('forms.dateInvalid') : null)

  function set(key: 'd' | 'm' | 'y', raw: string) {
    const max = key === 'y' ? 4 : 2
    const v = raw.replace(/\D/g, '').slice(0, max)
    const next = { ...parts, [key]: v }
    setParts(next)
    if (v.length === max) (key === 'd' ? refs.m : key === 'm' ? refs.y : null)?.current?.focus()
    const c = next.d && next.m && next.y.length === 4
    const isoNext = c ? `${next.y}-${next.m.padStart(2, '0')}-${next.d.padStart(2, '0')}` : ''
    const dt = c ? new Date(`${isoNext}T00:00:00`) : null
    const ok = !!dt && !isNaN(dt.getTime()) && dt.getDate() === Number(next.d) && dt.getMonth() + 1 === Number(next.m)
    onChange(ok ? isoNext : null)
  }

  function back(key: 'd' | 'm' | 'y', e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !parts[key]) (key === 'y' ? refs.m : key === 'm' ? refs.d : null)?.current?.focus()
  }

  const box = (key: 'd' | 'm' | 'y', label: string, placeholder: string, w: string) => (
    <label className={clsx('flex flex-col', w)}>
      <span className="mb-1 text-xs font-medium text-slate-500">{label}</span>
      <input
        id={key === 'd' ? id : undefined}
        ref={refs[key]}
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-describedby={labelledBy}
        aria-invalid={hasError || !!problem}
        placeholder={placeholder}
        value={parts[key]}
        onChange={(e) => set(key, e.target.value)}
        onKeyDown={(e) => back(key, e)}
        onBlur={() => {
          setTouched(true)
          if (key !== 'y' && parts[key].length === 1 && parts[key] !== '0') setParts((pp) => ({ ...pp, [key]: pp[key].padStart(2, '0') }))
        }}
        className={clsx(inputCls, 'h-12 text-center tabular-nums tracking-widest', hasError || problem ? errCls : okCls)}
      />
    </label>
  )

  return (
    <div>
      <div className="flex items-end gap-2" role="group" aria-labelledby={labelledBy}>
        {box('d', t('forms.day'), 'DD', 'w-20')}
        <span className="pb-3 text-slate-300">/</span>
        {box('m', t('forms.month'), 'MM', 'w-20')}
        <span className="pb-3 text-slate-300">/</span>
        {box('y', t('forms.year'), 'AAAA', 'w-28')}
      </div>
      {problem && <p className="mt-1.5 text-sm text-rose-600">{problem}</p>}
    </div>
  )
}
