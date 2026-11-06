import { AnimatePresence, motion } from 'framer-motion'
import { Check, FileText, Image as ImageIcon, Loader2, Paperclip, X } from 'lucide-react'
import clsx from 'clsx'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AttachmentValue, Field, FieldValue } from '../lib/types'
import { compressImage } from './compress'

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
}

export function FieldInput({ field, value, onChange, error, onUpload, onOpenFile }: Props) {
  const { t } = useTranslation()
  const id = `f-${field.id}`
  const describedBy = [field.description && `${id}-d`, error && `${id}-e`].filter(Boolean).join(' ') || undefined

  if (field.type === 'info') {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
        {field.label && <p className="font-medium text-slate-800">{field.label}</p>}
        {field.description && <p className="mt-1 whitespace-pre-line">{field.description}</p>}
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
        return <input {...common} type="date" value={str} onChange={(e) => onChange(e.target.value)} className={clsx(inputCls, 'h-12', error ? errCls : okCls)} />
      case 'number':
      case 'currency':
        return (
          <div className="relative">
            {field.type === 'currency' && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">€</span>}
            <input
              {...common}
              type="number"
              inputMode="decimal"
              step="any"
              value={str}
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
              className={clsx(inputCls, 'h-12', field.type === 'currency' && 'pl-8', error ? errCls : okCls)}
            />
          </div>
        )
      case 'email':
        return <input {...common} type="email" autoComplete="email" value={str} onChange={(e) => onChange(e.target.value)} className={clsx(inputCls, 'h-12', error ? errCls : okCls)} />
      case 'phone':
        return <input {...common} type="tel" autoComplete="tel" placeholder="+55 11 91234 5678" value={str} onChange={(e) => onChange(e.target.value)} className={clsx(inputCls, 'h-12', error ? errCls : okCls)} />
      case 'select':
        return (
          <select {...common} value={str} onChange={(e) => onChange(e.target.value || null)} className={clsx(inputCls, 'h-12', error ? errCls : okCls)}>
            <option value="">{t('forms.selectPlaceholder')}</option>
            {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      case 'radio':
        return (
          <div role="radiogroup" aria-labelledby={`${id}-l`} className="space-y-2">
            {field.options.map((o) => (
              <OptionRow key={o} label={o} checked={value === o} round onToggle={() => onChange(value === o ? null : o)} />
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
                label={o}
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
        {field.label}
        {field.required && <span className="ml-0.5 text-rose-500" aria-hidden>*</span>}
      </label>
      {field.description && <p id={`${id}-d`} className="mt-1 whitespace-pre-line text-sm text-slate-500">{field.description}</p>}
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
