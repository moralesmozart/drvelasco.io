import { AnimatePresence, motion } from 'framer-motion'
import { Baby, ChevronDown, Check, HeartPulse, Pill, Plus, Stethoscope, Trash2, User, UserRound, Users } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ageFrom, RELATIONS } from '../lib/family'
import type { AttachmentValue, Field, FieldValue } from '../lib/types'
import { FieldInput } from './FieldInput'
import { isVisible, validate } from './logic'

/* ───────── Step 0: who is it for? ───────── */
export function FamilyChoice({ onPick }: { onPick: (mode: 'one' | 'family') => void }) {
  const { t } = useTranslation()
  const tile = (mode: 'one' | 'family', title: string, hint: string, art: React.ReactNode, delay: number) => (
    <motion.button
      type="button"
      onClick={() => onPick(mode)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="group flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-brand-400 hover:shadow-lift focus-visible:border-brand-500"
    >
      {art}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold text-slate-900">{title}</span>
        <span className="block text-sm text-slate-500">{hint}</span>
      </span>
      <ChevronDown className="h-5 w-5 -rotate-90 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
    </motion.button>
  )
  const bubble = (Icon: typeof HeartPulse, cls: string, d: number) => (
    <motion.span
      className={clsx('absolute grid h-7 w-7 place-items-center rounded-full bg-white shadow-md', cls)}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: d }}
    >
      <Icon className="h-3.5 w-3.5" />
    </motion.span>
  )
  return (
    <div className="py-2">
      <h2 className="text-xl font-semibold text-slate-900">{t('family.choiceTitle')}</h2>
      <p className="mt-1 text-slate-500">{t('family.choiceHint')}</p>
      <div className="mt-6 space-y-4">
        {tile('one', t('family.onlyMe'), t('family.onlyMeHint'), (
          <span className="relative grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <User className="h-9 w-9" />
            {bubble(HeartPulse, '-right-2 -top-2 text-rose-500', 0)}
          </span>
        ), 0.05)}
        {tile('family', t('family.withFamily'), t('family.withFamilyHint'), (
          <span className="relative grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <Users className="h-9 w-9" />
            {bubble(Stethoscope, '-right-2 -top-2 text-brand-700', 0.4)}
            {bubble(Pill, '-bottom-2 -left-2 text-violet-600', 1)}
          </span>
        ), 0.12)}
      </div>
    </div>
  )
}

/* ───────── Family members accordion ───────── */
export interface MemberDraft {
  key: string
  relation: string // filha | … | outro
  other: string
  values: Record<string, FieldValue>
  open: boolean
  tried: boolean
}

export const newMember = (): MemberDraft => ({ key: crypto.randomUUID(), relation: 'filho', other: '', values: {}, open: true, tried: false })
export const memberRelation = (m: MemberDraft) => (m.relation === 'outro' && m.other.trim() ? `outro:${m.other.trim()}` : m.relation)
/** Holder answers (for conditions) with every per-person answer taken only from the member. */
export function memberScope(m: MemberDraft, fields: Field[], holderValues: Record<string, FieldValue>) {
  return { ...holderValues, ...Object.fromEntries(fields.map((f) => [f.id, m.values[f.id] ?? null])) }
}
export function memberErrors(m: MemberDraft, fields: Field[], holderValues: Record<string, FieldValue>) {
  return validate(fields, memberScope(m, fields, holderValues))
}

export function FamilyMembers({ fields, holderValues, members, onChange, onUpload, showErrors }: {
  fields: Field[] // per-person fields only
  holderValues: Record<string, FieldValue>
  members: MemberDraft[]
  onChange: (m: MemberDraft[]) => void
  onUpload: (f: File) => Promise<AttachmentValue>
  showErrors: boolean
}) {
  const { t } = useTranslation()
  const titleField = fields.find((f) => f.type === 'short_text')
  const dateField = fields.find((f) => f.type === 'date')
  const errText = (c: string) => (c === 'email' ? t('forms.errEmail') : c === 'phone' ? t('forms.errPhone') : t('forms.errRequired'))
  const update = (key: string, patch: Partial<MemberDraft>) => onChange(members.map((m) => (m.key === key ? { ...m, ...patch } : m)))

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {members.map((m) => {
          const errs = memberErrors(m, fields, holderValues)
          const nErr = Object.keys(errs).length
          const name = titleField ? String(m.values[titleField.id] ?? '').trim() : ''
          const age = dateField ? ageFrom(m.values[dateField.id]) : null
          const relText = m.relation === 'outro' ? (m.other.trim() || t('family.rel.outro')) : t(`family.rel.${m.relation}`)
          const flagged = (showErrors || m.tried) && nErr > 0
          const RelIcon = age !== null && age < 12 ? Baby : UserRound
          return (
            <motion.div
              key={m.key}
              id={`m-${m.key}`}
              layout="position"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={clsx('overflow-hidden rounded-2xl border bg-white transition', flagged ? 'border-rose-300' : nErr === 0 ? 'border-brand-200' : 'border-slate-200', m.open && 'shadow-card')}
            >
              <button
                type="button"
                onClick={() => update(m.key, { open: !m.open })}
                aria-expanded={m.open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700"><RelIcon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{name || t('family.newPerson')}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">{relText}</span>
                    {age !== null && <span>{t('family.years', { count: age })}</span>}
                    {nErr > 0 && <span className={flagged ? 'text-rose-600' : ''}>· {t('family.missing', { count: nErr })}</span>}
                  </span>
                </span>
                {nErr === 0 ? (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700" title={t('family.complete')}><Check className="h-3.5 w-3.5" /></span>
                ) : (
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', flagged ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>{t('family.incomplete')}</span>
                )}
                <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition', m.open && 'rotate-180')} />
              </button>

              <AnimatePresence initial={false}>
                {m.open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="space-y-6 border-t border-slate-100 px-4 pb-4 pt-4">
                      <div>
                        <p className="mb-2 text-[15px] font-medium text-slate-900">{t('family.relation')}</p>
                        <div className="flex flex-wrap gap-2" role="radiogroup">
                          {RELATIONS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              role="radio"
                              aria-checked={m.relation === r}
                              onClick={() => update(m.key, { relation: r })}
                              className={clsx('rounded-full border px-3.5 py-1.5 text-sm font-medium transition', m.relation === r ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300')}
                            >
                              {t(`family.rel.${r}`)}
                            </button>
                          ))}
                        </div>
                        {m.relation === 'outro' && (
                          <input
                            value={m.other}
                            maxLength={40}
                            onChange={(e) => update(m.key, { other: e.target.value })}
                            placeholder={t('family.otherPlaceholder')}
                            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[15px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                          />
                        )}
                      </div>
                      {fields.filter((f) => isVisible(f, memberScope(m, fields, holderValues))).map((f) => (
                        <FieldInput
                          key={f.id}
                          field={f}
                          value={m.values[f.id]}
                          onChange={(v) => update(m.key, { values: { ...m.values, [f.id]: v } })}
                          error={(showErrors || m.tried) && errs[f.id] ? errText(errs[f.id]) : undefined}
                          onUpload={onUpload}
                          idPrefix={m.key}
                        />
                      ))}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => { if (confirm(t('family.removeConfirm', { name: name || t('family.newPerson') }))) onChange(members.filter((x) => x.key !== m.key)) }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" /> {t('family.remove')}
                        </button>
                        <button
                          type="button"
                          onClick={() => update(m.key, nErr ? { tried: true } : { open: false, tried: true })}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                        >
                          <Check className="h-4 w-4" /> {t('family.savePerson')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <button
        type="button"
        disabled={members.length >= 10}
        onClick={() => onChange([...members.map((m) => ({ ...m, open: false })), newMember()])}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 py-3.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" /> {members.length ? t('family.add') : t('family.addFirst')}
      </button>
      {members.length >= 10 && <p className="text-center text-xs text-slate-500">{t('family.max')}</p>}
    </div>
  )
}
