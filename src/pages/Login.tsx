import { motion } from 'framer-motion'
import {
  Activity, CalendarCheck, ClipboardCheck, FileHeart, HeartPulse, Lock, Mail, Pill, ShieldCheck, Stethoscope, Syringe,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { Button, Input, Label } from '../components/ui'
import { LangSwitch, Logo } from '../components/Layout'
import { useAuth } from '../lib/auth'
import { isDemo } from '../lib/repo'

export default function Login() {
  const { t } = useTranslation()
  const { user, signIn, enterDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.15fr_1fr]">
      {/* Left: care-themed hero */}
      <section className="relative hidden overflow-hidden bg-care-700 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-care-500/60" />
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-care-600" />
        <div className="relative z-10 flex items-center gap-2.5 p-10">
          <Logo light />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center gap-10 px-10 pb-16 xl:px-16">
          <div className="max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold leading-tight tracking-tight xl:text-[44px]"
            >
              {t('auth.heroTitle')}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-4 text-lg text-care-100">
              {t('auth.heroSubtitle')}
            </motion.p>
          </div>
          <CareIllustration />
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-care-100">
            {(['heroPoint1', 'heroPoint2', 'heroPoint3'] as const).map((k) => (
              <li key={k} className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-care-200" /> {t(`auth.${k}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Right: sign in */}
      <section className="flex flex-col bg-care-50/40 p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <span className="lg:hidden"><Logo /></span>
          <span className="ml-auto"><LangSwitch /></span>
        </div>
        <motion.form
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="m-auto w-full max-w-sm"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true); setError(null)
            const res = await signIn(email, password)
            setBusy(false)
            if (res === 'invalid') setError(t('auth.invalid'))
            if (res === 'not_admin') setError(t('auth.notAdmin'))
          }}
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-care-100 text-care-700 shadow-sm">
            <Stethoscope className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">{t('auth.title')}</h2>
          <p className="mt-1.5 text-slate-500">{t('auth.subtitle')}</p>

          <div className="mt-8 space-y-5">
            {isDemo ? (
              <Button type="button" className="h-12 w-full rounded-full text-base" onClick={enterDemo}>{t('auth.demoEnter')}</Button>
            ) : (
              <>
                <div>
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl pl-10" />
                  </div>
                </div>
                {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                <Button type="submit" className="h-12 w-full rounded-full text-base" loading={busy}>{t('auth.submit')}</Button>
              </>
            )}
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> {t('auth.secure')}
          </p>
        </motion.form>
      </section>
    </div>
  )
}

/* ───────── Illustration: request cards with care icons floating around ───────── */

const CARDS: Array<{ icon: LucideIcon; tone: string; status: string; dot: string; w: string }> = [
  { icon: Stethoscope, tone: 'bg-care-100 text-care-700', status: 'auth.statusNew', dot: 'bg-sky-400', w: 'w-24' },
  { icon: FileHeart, tone: 'bg-amber-100 text-amber-700', status: 'auth.statusReview', dot: 'bg-amber-400', w: 'w-32' },
  { icon: ClipboardCheck, tone: 'bg-emerald-100 text-emerald-700', status: 'auth.statusReady', dot: 'bg-emerald-500', w: 'w-20' },
]

const BUBBLES: Array<{ icon: LucideIcon; cls: string; delay: number }> = [
  { icon: HeartPulse, cls: '-left-6 -top-6 bg-rose-100 text-rose-600', delay: 0 },
  { icon: Syringe, cls: 'right-10 -top-8 bg-sky-100 text-sky-700', delay: 0.6 },
  { icon: Pill, cls: '-right-14 top-20 bg-violet-100 text-violet-700', delay: 1.2 },
  { icon: CalendarCheck, cls: '-left-8 bottom-6 bg-amber-100 text-amber-700', delay: 0.9 },
  { icon: Activity, cls: 'right-24 -bottom-7 bg-emerald-100 text-emerald-700', delay: 0.3 },
]

function CareIllustration() {
  const { t } = useTranslation()
  return (
    <div className="relative w-full max-w-md" aria-hidden>
      <div className="space-y-3">
        {CARDS.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 200, damping: 22 }}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 text-slate-800 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]"
            style={{ marginLeft: i * 28 }}
          >
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${c.tone}`}>
              <c.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className={`h-2.5 rounded-full bg-slate-200 ${c.w}`} />
              <div className="h-2 w-16 rounded-full bg-slate-100" />
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {t(c.status)}
            </span>
          </motion.div>
        ))}
      </div>
      {BUBBLES.map((b, i) => (
        <motion.span
          key={i}
          className={`absolute grid h-12 w-12 place-items-center rounded-full shadow-lg ring-4 ring-white/20 ${b.cls}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { delay: 0.5 + b.delay * 0.3 },
            scale: { delay: 0.5 + b.delay * 0.3, type: 'spring' },
            y: { delay: b.delay, duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <b.icon className="h-5 w-5" />
        </motion.span>
      ))}
    </div>
  )
}
