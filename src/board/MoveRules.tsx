import { ArrowLeft, ArrowRight, Check, Shuffle, StepBack, StepForward } from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, Modal } from '../components/ui'
import { phaseLabel } from '../lib/localize'
import { repo } from '../lib/repo'
import type { Phase, Transition } from '../lib/types'

type Rules = Record<string, string[]> // from phase id → allowed targets ([] = any phase)

const toRules = (phases: Phase[], transitions: Transition[]): Rules =>
  Object.fromEntries(phases.map((p) => [p.id, transitions.filter((t) => t.from_phase_id === p.id).map((t) => t.to_phase_id)]))

/** Where a card may go from each phase. A phase with nothing ticked can move anywhere. */
export function MoveRulesDialog({ open, onClose, phases, transitions, focusPhaseId, onSaved }: {
  open: boolean; onClose: () => void; phases: Phase[]; transitions: Transition[]; focusPhaseId?: string | null; onSaved: () => void
}) {
  const { t, i18n } = useTranslation()
  const ordered = [...phases].sort((a, b) => a.position - b.position)
  const [rules, setRules] = useState<Rules>({})
  const [busy, setBusy] = useState(false)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // fresh copy every time it opens
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) setRules(toRules(phases, transitions)) }

  useEffect(() => {
    if (open && focusPhaseId) setTimeout(() => rowRefs.current[focusPhaseId]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150)
  }, [open, focusPhaseId])

  const idx = (id: string) => ordered.findIndex((p) => p.id === id)
  const preset = (kind: 'free' | 'forward' | 'forwardBack') =>
    setRules(Object.fromEntries(ordered.map((p, i) => {
      if (kind === 'free') return [p.id, []]
      const later = ordered.slice(i + 1).map((x) => x.id)
      const back = kind === 'forwardBack' && i > 0 ? [ordered[i - 1].id] : []
      const targets = [...back, ...later]
      // last phase with nowhere to go: allow going back one step so it is never stuck as "any"
      return [p.id, targets.length ? targets : i > 0 ? [ordered[i - 1].id] : []]
    })))
  const toggle = (from: string, to: string) =>
    setRules((r) => ({ ...r, [from]: r[from]?.includes(to) ? r[from].filter((x) => x !== to) : [...(r[from] ?? []), to] }))

  async function save() {
    setBusy(true)
    try {
      const rows = ordered.flatMap((p) => (rules[p.id] ?? []).map((to) => ({ from_phase_id: p.id, to_phase_id: to })))
      await repo.setTransitions(ordered.map((p) => p.id), rows)
      toast.success(t('rules.saved'))
      onSaved()
      onClose()
    } catch {
      toast.error(t('common.error'))
    } finally { setBusy(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={t('rules.title')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button loading={busy} onClick={save}>{t('common.save')}</Button></>}
    >
      <p className="-mt-1 text-sm text-slate-500">{t('rules.hint')}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-400">{t('rules.presets')}</span>
        {([['free', Shuffle], ['forward', StepForward], ['forwardBack', StepBack]] as const).map(([k, Icon]) => (
          <button key={k} type="button" onClick={() => preset(k)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">
            <Icon className="h-3.5 w-3.5" /> {t(`rules.${k}`)}
          </button>
        ))}
      </div>

      <div className="scroll-thin mt-5 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
        {ordered.map((p) => {
          const targets = rules[p.id] ?? []
          const any = targets.length === 0
          return (
            <div
              key={p.id}
              ref={(el) => { rowRefs.current[p.id] = el }}
              className={clsx('rounded-xl border p-3.5', focusPhaseId === p.id ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200')}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="font-semibold text-slate-900">{phaseLabel(p, i18n.language)}</span>
                <span className="text-sm text-slate-400">→</span>
                <span className={clsx('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', any ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                  {any ? t('rules.any') : t('rules.count', { count: targets.length })}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {ordered.filter((x) => x.id !== p.id).map((x) => {
                  const on = targets.includes(x.id)
                  const back = idx(x.id) < idx(p.id)
                  return (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(p.id, x.id)}
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                        on ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      )}
                      style={on ? { background: x.color } : undefined}
                    >
                      {on ? <Check className="h-3 w-3" /> : back ? <ArrowLeft className="h-3 w-3 text-slate-400" /> : <ArrowRight className="h-3 w-3 text-slate-400" />}
                      {phaseLabel(x, i18n.language)}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">{t('rules.anyHint')}</p>
    </Modal>
  )
}
