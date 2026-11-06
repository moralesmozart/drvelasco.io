import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, CheckCircle2, FileQuestion, Send, User, Users } from 'lucide-react'
import { FormHero } from '../forms/FormHero'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { LangSwitch } from '../components/Layout'
import { Button, Spinner } from '../components/ui'
import { FamilyChoice, FamilyMembers, HolderCard, memberErrors, memberRelation, memberScope, newMember } from '../forms/Family'
import { ageFrom } from '../lib/family'
import type { MemberDraft } from '../forms/Family'
import { FieldInput } from '../forms/FieldInput'
import { isVisible, validate, visibleValues } from '../forms/logic'
import { Turnstile } from '../forms/Turnstile'
import { isDemo } from '../lib/repo'

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
import { repo } from '../lib/repo'
import { formText } from '../lib/localize'
import type { FieldValue } from '../lib/types'

export default function PublicForm() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['public-form', slug], queryFn: () => repo.getPublicForm(slug), retry: 1 })
  const [values, setValues] = useState<Record<string, FieldValue>>({})
  const [touched, setTouched] = useState(false)
  const [hp, setHp] = useState('')
  const useCaptcha = !!TURNSTILE_KEY && !isDemo
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [captchaMissing, setCaptchaMissing] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [mode, setMode] = useState<'choose' | 'one' | 'family'>('choose')
  const holderNeeds = true // the holder always needs the certificate too
  const [members, setMembers] = useState<MemberDraft[]>([])
  const [familyMsg, setFamilyMsg] = useState<string | null>(null)
  const [holderOpen, setHolderOpen] = useState(false)
  const [holderTried, setHolderTried] = useState(false)

  const allFields = useMemo(() => data?.fields ?? [], [data])
  const perPerson = useMemo(() => allFields.filter((f) => f.per_person), [allFields])
  const hasFamily = perPerson.length > 0
  const titleId = allFields.find((f) => f.type === 'short_text')?.id
  const step = hasFamily ? mode : 'one'
  // contact-only holder: hide their per-person questions (except the name)
  const fields = useMemo(
    () => (step === 'family' && !holderNeeds ? allFields.filter((f) => !f.per_person || f.id === titleId) : allFields),
    [allFields, step, holderNeeds, titleId],
  )
  const rawSettings = data?.pipe.settings ?? {}
  const settings = { ...rawSettings, ...formText(rawSettings, i18n.language) }
  const bg = settings.brand_color || '#8bbcb4'

  const errorText = (code: string) =>
    code === 'email' ? t('forms.errEmail') : code === 'phone' ? t('forms.errPhone') : t('forms.errRequired')

  function setValue(id: string, v: FieldValue) {
    setValues({ ...values, [id]: v })
  }
  const liveErrors = validate(fields, values)
  const errors: Record<string, string> = touched || holderTried
    ? Object.fromEntries(Object.entries(liveErrors).map(([k, c]) => [k, errorText(c)]))
    : {}

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    const first = fields.find((f) => liveErrors[f.id])
    if (first) {
      const go = () => document.getElementById(`f-${first.id}`)?.closest('[data-field]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (step === 'family' && !holderOpen) {
        setHolderOpen(true)
        setMembers(members.map((m) => ({ ...m, open: false })))
        setTimeout(go, 260)
      } else go()
      return
    }
    let family: Parameters<typeof repo.submitPublicForm>[4]
    if (step === 'family') {
      setFamilyMsg(null)
      if (!members.length) { setFamilyMsg(t('family.needOne')); document.getElementById('family')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
      const bad = members.find((m) => Object.keys(memberErrors(m, perPerson, values)).length)
      if (bad) {
        setHolderOpen(false)
        setMembers(members.map((m) => (m.key === bad.key ? { ...m, open: true, tried: true } : { ...m, open: false })))
        setFamilyMsg(t('family.fixMembers'))
        setTimeout(() => document.getElementById(`m-${bad.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260)
        return
      }
      family = {
        holderNeeds,
        members: members.map((m) => {
          const vis = visibleValues(perPerson, memberScope(m, perPerson, values))
          return { relation: memberRelation(m), values: Object.fromEntries(Object.entries(vis).filter(([k]) => perPerson.some((f) => f.id === k))) }
        }),
      }
    }
    if (useCaptcha && !captcha) { setCaptchaMissing(true); return }
    setState('sending')
    try {
      await repo.submitPublicForm(slug, visibleValues(fields, values), hp, useCaptcha ? captcha ?? undefined : undefined, family)
      setState('sent')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setState('error')
      if (useCaptcha) setCaptchaReset((n) => n + 1)
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
  const birthId = perPerson.find((f) => f.type === 'date')?.id
  const fieldList = (
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
  )
  const errorCount = Object.keys(errors).length
  const people = step === 'family' ? members.length + (holderNeeds ? 1 : 0) : 1
  const reset = () => { setValues({}); setTouched(false); setHolderTried(false); setHolderOpen(false); setMembers([]); setFamilyMsg(null); setMode('choose'); setState('idle') }

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
                <Button variant="secondary" className="mt-6" onClick={reset}>
                  {t('forms.sendAnother')}
                </Button>
              </motion.div>
            ) : step === 'choose' ? (
              <motion.div key="choose" exit={{ opacity: 0 }}>
                <FamilyChoice onPick={(m) => { setMode(m); setHolderOpen(false); if (m === 'family' && !members.length) setMembers([newMember(false)]) }} />
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={submit} className="space-y-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {hasFamily && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      {step === 'family' ? <Users className="h-4 w-4 text-violet-600" /> : <User className="h-4 w-4 text-brand-600" />}
                      {step === 'family' ? t('family.withFamily') : t('family.onlyMe')}
                    </span>
                    <button type="button" onClick={() => setMode('choose')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-brand-700 hover:bg-white">
                      <ArrowLeftRight className="h-3.5 w-3.5" /> {t('family.change')}
                    </button>
                  </div>
                )}
                {/* honeypot: hidden from people, bots fill it */}
                <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
                </div>
                {step !== 'family' && fieldList}

                {step === 'family' && (
                  <section id="family" className="space-y-3 border-t border-slate-100 pt-6">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Users className="h-5 w-5 text-violet-600" /> {t('family.yourFamily')}</h2>
                      <p className="text-sm text-slate-500">{t('family.yourFamilyHint')}</p>
                    </div>
                    <HolderCard
                      name={titleId ? String(values[titleId] ?? '').trim() : ''}
                      contactOnly={!holderNeeds}
                      age={holderNeeds && birthId ? ageFrom(values[birthId]) : null}
                      nErr={Object.keys(liveErrors).length}
                      flagged={(touched || holderTried) && Object.keys(liveErrors).length > 0}
                      open={holderOpen}
                      onToggle={() => { if (!holderOpen) setMembers(members.map((m) => ({ ...m, open: false }))); setHolderOpen(!holderOpen) }}
                      onSave={() => { setHolderTried(true); if (!Object.keys(liveErrors).length) setHolderOpen(false) }}
                    >
                      {fieldList}
                    </HolderCard>
                    <FamilyMembers
                      onOpen={() => setHolderOpen(false)}
                      fields={perPerson}
                      holderValues={values}
                      members={members}
                      onChange={(m) => { setMembers(m); setFamilyMsg(null) }}
                      onUpload={(file) => repo.uploadPublicFile(slug, file)}
                      showErrors={touched}
                    />
                    {familyMsg && <p role="alert" className="text-sm text-rose-600">{familyMsg}</p>}
                  </section>
                )}

                <div className="space-y-3 border-t border-slate-100 pt-6">
                  {touched && errorCount > 0 && (
                    <p role="alert" className="text-sm text-rose-600">{t('forms.fixErrors', { count: errorCount })}</p>
                  )}
                  {useCaptcha && <Turnstile siteKey={TURNSTILE_KEY!} lang={i18n.language} onToken={(tk) => { setCaptcha(tk); if (tk) setCaptchaMissing(false) }} resetKey={captchaReset} />}
                  {captchaMissing && <p role="alert" className="text-sm text-rose-600">{t('forms.captcha')}</p>}
                  {state === 'error' && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{t('forms.sendFailed')}</p>}
                  <Button type="submit" loading={state === 'sending'} className="h-12 w-full text-base sm:w-auto sm:px-8">
                    <Send className="h-4 w-4" /> {step === 'family' ? t('family.submitN', { count: people }) : settings.submit_label || t('forms.submit')}
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
