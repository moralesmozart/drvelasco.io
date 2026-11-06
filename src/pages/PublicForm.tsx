import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileQuestion, Send } from 'lucide-react'
import { FormHero } from '../forms/FormHero'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { LangSwitch } from '../components/Layout'
import { Button, Spinner } from '../components/ui'
import { FieldInput } from '../forms/FieldInput'
import { isVisible, validate, visibleValues } from '../forms/logic'
import { repo } from '../lib/repo'
import { formText } from '../lib/localize'
import type { FieldValue } from '../lib/types'

export default function PublicForm() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['public-form', slug], queryFn: () => repo.getPublicForm(slug), retry: 1 })
  const [values, setValues] = useState<Record<string, FieldValue>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState(false)
  const [hp, setHp] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const fields = useMemo(() => data?.fields ?? [], [data])
  const rawSettings = data?.pipe.settings ?? {}
  const settings = { ...rawSettings, ...formText(rawSettings, i18n.language) }
  const bg = settings.brand_color || '#8bbcb4'

  const errorText = (code: string) =>
    code === 'email' ? t('forms.errEmail') : code === 'phone' ? t('forms.errPhone') : t('forms.errRequired')

  function setValue(id: string, v: FieldValue) {
    const next = { ...values, [id]: v }
    setValues(next)
    if (touched) {
      const e = validate(fields, next)
      setErrors(Object.fromEntries(Object.entries(e).map(([k, c]) => [k, errorText(c)])))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    const e2 = validate(fields, values)
    setErrors(Object.fromEntries(Object.entries(e2).map(([k, c]) => [k, errorText(c)])))
    const first = fields.find((f) => e2[f.id])
    if (first) {
      document.getElementById(`f-${first.id}`)?.closest('[data-field]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setState('sending')
    try {
      await repo.submitPublicForm(slug, visibleValues(fields, values), hp)
      setState('sent')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setState('error')
    }
  }

  if (isLoading) return <div className="grid min-h-screen place-items-center" style={{ background: bg }}><Spinner className="border-white border-t-transparent" /></div>

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lift">
          <FileQuestion className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-3 text-lg font-semibold">{t('forms.notFound')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('forms.notFoundHint')}</p>
        </div>
      </div>
    )
  }

  const visibleFields = fields.filter((f) => isVisible(f, values))
  const errorCount = Object.keys(errors).length

  return (
    <div className="min-h-screen px-4 py-6 sm:py-12" style={{ background: bg }}>
      <div className="mx-auto mb-4 flex max-w-5xl justify-end"><LangSwitch /></div>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <FormHero title={settings.title || data.pipe.name} description={settings.description} kicker={settings.logo_kicker} name={settings.logo_name} />

        <motion.main
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white p-6 shadow-lift sm:p-8"
        >
          <AnimatePresence mode="wait">
            {state === 'sent' ? (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}>
                  <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
                </motion.div>
                <h2 className="mt-4 text-xl font-semibold">{t('forms.sentTitle')}</h2>
                <p className="mx-auto mt-2 max-w-sm text-slate-600">{settings.success_message || t('forms.sentDefault')}</p>
                <Button variant="secondary" className="mt-6" onClick={() => { setValues({}); setErrors({}); setTouched(false); setState('idle') }}>
                  {t('forms.sendAnother')}
                </Button>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={submit} className="space-y-7" exit={{ opacity: 0 }}>
                {/* honeypot: hidden from people, bots fill it */}
                <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
                </div>
                <AnimatePresence initial={false}>
                  {visibleFields.map((f) => (
                    <motion.div
                      key={f.id}
                      data-field
                      layout="position"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FieldInput
                        field={f}
                        value={values[f.id]}
                        onChange={(v) => setValue(f.id, v)}
                        error={errors[f.id]}
                        onUpload={(file) => repo.uploadPublicFile(slug, file)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="space-y-3 border-t border-slate-100 pt-6">
                  {touched && errorCount > 0 && (
                    <p role="alert" className="text-sm text-rose-600">{t('forms.fixErrors', { count: errorCount })}</p>
                  )}
                  {state === 'error' && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{t('forms.sendFailed')}</p>}
                  <Button type="submit" loading={state === 'sending'} className="h-12 w-full text-base sm:w-auto sm:px-8">
                    <Send className="h-4 w-4" /> {settings.submit_label || t('forms.submit')}
                  </Button>
                  <p className="text-xs text-slate-400">{t('forms.privacy')}</p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.main>
      </div>
    </div>
  )
}
