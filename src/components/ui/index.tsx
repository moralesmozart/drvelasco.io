import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import clsx from 'clsx'
import {
  forwardRef, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes,
} from 'react'
import { useTranslation } from 'react-i18next'
import { PALETTE } from '../../lib/defaults'

/* ───────────── Button ───────────── */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean }
>(function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
})

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx('grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800', className)}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ───────────── Inputs ───────────── */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400',
        'transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100',
        className,
      )}
      {...rest}
    />
  )
})

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400',
        'transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100',
        className,
      )}
      {...rest}
    />
  )
}

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
      {hint && <span className="mt-0.5 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300')}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
          className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow', checked ? 'right-0.5' : 'left-0.5')}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className="grid h-7 w-7 place-items-center rounded-full ring-offset-2 transition hover:scale-110"
          style={{ backgroundColor: c, boxShadow: value === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}
        >
          {value === c && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

/* ───────────── Modal ───────────── */
export function Modal({
  open, onClose, title, children, footer, width = 'max-w-md',
}: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={clsx('relative w-full rounded-2xl bg-white shadow-lift', width)}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <IconButton label={t('common.close')} onClick={onClose} className="-mr-2 -mt-1">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="px-6 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel, danger = true, confirmText, children, disabled,
}: {
  open: boolean; onClose: () => void; onConfirm: () => Promise<void> | void; title: ReactNode; body?: ReactNode
  confirmLabel?: string; danger?: boolean; confirmText?: string; children?: ReactNode; disabled?: boolean
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')
  useEffect(() => { if (open) setTyped('') }, [open])
  const blocked = disabled || (confirmText !== undefined && typed.trim() !== confirmText.trim())

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            disabled={blocked}
            onClick={async () => {
              setBusy(true)
              try { await onConfirm(); onClose() } finally { setBusy(false) }
            }}
          >
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    >
      {body && <p className="text-sm leading-relaxed text-slate-600">{body}</p>}
      {children}
      {confirmText !== undefined && (
        <Input className="mt-3" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmText} autoFocus />
      )}
    </Modal>
  )
}

/* ───────────── Dropdown menu ───────────── */
export interface MenuItem { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }

export function Menu({ trigger, items, align = 'right' }: { trigger: (open: () => void) => ReactNode; items: MenuItem[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="relative" ref={ref}>
      {trigger(() => setOpen((o) => !o))}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className={clsx('absolute top-full z-40 mt-1 min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lift', align === 'right' ? 'right-0' : 'left-0')}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                disabled={it.disabled}
                onClick={() => { setOpen(false); it.onClick() }}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-40',
                  it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent', className)} />
}
