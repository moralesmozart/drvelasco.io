import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ChevronDown, ClipboardList, HeartPulse, MessageCircleHeart, Pill, ShieldCheck, Stethoscope, Syringe,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrandMark } from './BrandMark'

const BUBBLES: Array<{ icon: LucideIcon; cls: string; delay: number }> = [
  { icon: HeartPulse, cls: 'left-4 top-5 bg-rose-50 text-rose-500', delay: 0 },
  { icon: Syringe, cls: 'right-5 top-8 bg-sky-50 text-sky-600', delay: 0.7 },
  { icon: Pill, cls: 'left-7 bottom-6 bg-violet-50 text-violet-600', delay: 1.3 },
  { icon: Activity, cls: 'right-8 bottom-5 bg-emerald-50 text-emerald-600', delay: 0.4 },
]

const STEPS: Array<{ icon: LucideIcon; key: 'step1' | 'step2' | 'step3' }> = [
  { icon: ClipboardList, key: 'step1' },
  { icon: Stethoscope, key: 'step2' },
  { icon: MessageCircleHeart, key: 'step3' },
]

/** Left column of the public form: animated brand header, description, how-it-works steps. */
export function FormHero({ title, description, kicker, name }: { title: string; description?: string; kicker?: string; name?: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const paragraphs = (description ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const long = paragraphs.join(' ').length > 280

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl bg-white shadow-lift lg:sticky lg:top-8"
    >
      {/* brand header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#d3e6e3] via-[#c4dbd8] to-[#b8d1d3] px-6 pb-4 pt-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/25" />
        {BUBBLES.map((b, i) => (
          <motion.span
            key={i}
            aria-hidden
            className={clsx('absolute grid h-9 w-9 place-items-center rounded-full shadow-sm ring-2 ring-white/70', b.cls)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            transition={{
              opacity: { delay: 1 + b.delay * 0.3 },
              scale: { delay: 1 + b.delay * 0.3, type: 'spring' },
              y: { delay: b.delay, duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <b.icon className="h-4 w-4" />
          </motion.span>
        ))}
        <div className="relative">
          {name ? (
            <BrandMark kicker={kicker} name={name} />
          ) : (
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/80 text-care-700 shadow-sm">
              <Stethoscope className="h-8 w-8" />
            </span>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>

        {paragraphs.length > 0 && (
          <div className="mt-3">
            <div className="relative">
              <motion.div
                initial={false}
                animate={{ height: long && !expanded ? 132 : 'auto' }}
                className="space-y-3 overflow-hidden text-[15px] leading-relaxed text-slate-600 lg:!h-auto"
              >
                {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
              </motion.div>
              <AnimatePresence>
                {long && !expanded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white lg:hidden" />
                )}
              </AnimatePresence>
            </div>
            {long && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-care-700 hover:underline lg:hidden"
              >
                {expanded ? t('forms.readLess') : t('forms.readMore')}
                <ChevronDown className={clsx('h-4 w-4 transition', expanded && 'rotate-180')} />
              </button>
            )}
          </div>
        )}

        <ol className="mt-6 space-y-3 border-t border-slate-100 pt-6">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-care-50 text-care-700 ring-1 ring-care-100">
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-sm text-slate-700">
                <span className="mr-1.5 font-semibold text-care-700">{i + 1}.</span>
                {t(`forms.${s.key}`)}
              </span>
            </motion.li>
          ))}
        </ol>

        <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-care-600" /> {t('forms.confidential')}
        </p>
      </div>
    </motion.aside>
  )
}
