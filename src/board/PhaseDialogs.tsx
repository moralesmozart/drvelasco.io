import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, ColorPicker, ConfirmDialog, Input, Label, Modal, Textarea, Toggle } from '../components/ui'
import type { Phase, PhaseInput } from '../lib/types'

export function PhaseDialog({
  phase, open, onClose, onSave,
}: { phase: Phase | null; open: boolean; onClose: () => void; onSave: (input: PhaseInput) => Promise<void> }) {
  const { t } = useTranslation()
  const [form, setForm] = useState<PhaseInput>({ name: '', color: '#2563eb', description: '', is_final: false, translations: {} })
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const current = open ? (phase?.id ?? 'new') : null
  if (current !== key) {
    setKey(current)
    setForm({ name: phase?.name ?? '', color: phase?.color ?? '#2563eb', description: phase?.description ?? '', is_final: phase?.is_final ?? false, translations: phase?.translations ?? {} })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={phase ? t('board.editPhase') : t('board.addPhase')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button form="phase-form" type="submit" loading={busy} disabled={!form.name.trim()}>
            {phase ? t('common.save') : t('common.create')}
          </Button>
        </>
      }
    >
      <form
        id="phase-form"
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await onSave({ ...form, name: form.name.trim(), description: form.description?.trim() || null })
            onClose()
          } finally { setBusy(false) }
        }}
      >
        <div>
          <Label htmlFor="phase-name">{t('board.phaseName')}</Label>
          <Input id="phase-name" autoFocus maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="phase-name-es">{t('board.phaseNameEs')}</Label>
          <Input id="phase-name-es" maxLength={40} placeholder={form.name} value={form.translations?.es?.name ?? ''} onChange={(e) => setForm({ ...form, translations: { ...form.translations, es: { name: e.target.value } } })} />
        </div>
        <div>
          <Label>{t('board.phaseColor')}</Label>
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </div>
        <div>
          <Label htmlFor="phase-desc">{t('board.phaseDescription')}</Label>
          <Textarea id="phase-desc" rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <Toggle checked={form.is_final} onChange={(is_final) => setForm({ ...form, is_final })} label={t('board.isFinal')} hint={t('board.isFinalHint')} />
      </form>
    </Modal>
  )
}

export function DeletePhaseDialog({
  phase, phases, cardCount, onClose, onConfirm,
}: { phase: Phase | null; phases: Phase[]; cardCount: number; onClose: () => void; onConfirm: (moveTo: string | null) => Promise<void> }) {
  const { t } = useTranslation()
  const others = phases.filter((p) => p.id !== phase?.id)
  const [target, setTarget] = useState('')
  const [key, setKey] = useState<string | null>(null)
  if ((phase?.id ?? null) !== key) { setKey(phase?.id ?? null); setTarget(others[0]?.id ?? '') }
  const isLast = others.length === 0

  return (
    <ConfirmDialog
      open={!!phase}
      onClose={onClose}
      title={t('board.deletePhaseTitle', { name: phase?.name })}
      body={isLast ? t('board.lastPhase') : cardCount > 0 ? t('board.deletePhaseWithCards', { count: cardCount }) : t('board.deletePhaseEmpty')}
      confirmLabel={t('common.delete')}
      disabled={isLast || (cardCount > 0 && !target)}
      onConfirm={() => onConfirm(cardCount > 0 ? target : null)}
    >
      {cardCount > 0 && !isLast && (
        <div className="mt-4">
          <Label htmlFor="move-to">{t('board.moveCardsTo')}</Label>
          <select
            id="move-to"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
    </ConfirmDialog>
  )
}
