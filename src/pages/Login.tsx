import { motion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { Button, Input, Label } from '../components/ui'
import { LangSwitch } from '../components/Layout'
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-700 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(178,224,216,0.35),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <img src="./favicon.svg" alt="" className="h-8 w-8 rounded-lg ring-1 ring-white/30" /> drvelasco
          </div>
          <BoardIllustration />
          <p className="max-w-sm text-brand-100">{t('auth.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col p-6">
        <div className="flex justify-end"><LangSwitch /></div>
        <motion.form
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="m-auto w-full max-w-sm space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true); setError(null)
            const res = await signIn(email, password)
            setBusy(false)
            if (res === 'invalid') setError(t('auth.invalid'))
            if (res === 'not_admin') setError(t('auth.notAdmin'))
          }}
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('auth.title')}</h1>
            <p className="mt-1 text-sm text-slate-500 lg:hidden">{t('auth.subtitle')}</p>
          </div>
          {isDemo ? (
            <Button type="button" className="w-full" onClick={enterDemo}>{t('auth.demoEnter')}</Button>
          ) : (
            <>
              <div>
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <Button type="submit" className="w-full" loading={busy}>{t('auth.submit')}</Button>
            </>
          )}
        </motion.form>
      </div>
    </div>
  )
}

function BoardIllustration() {
  const cols = [3, 2, 4, 1]
  return (
    <div className="flex gap-3" aria-hidden>
      {cols.map((n, i) => (
        <div key={i} className="w-32 space-y-2 rounded-xl bg-white/10 p-2.5 backdrop-blur">
          <div className="h-2 w-16 rounded bg-white/50" />
          {Array.from({ length: n }).map((_, j) => (
            <motion.div
              key={j}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 + j * 0.06 }}
              className="space-y-1.5 rounded-lg bg-white/90 p-2"
            >
              <div className="h-1.5 w-20 rounded bg-slate-300" />
              <div className="h-1.5 w-12 rounded bg-slate-200" />
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}
