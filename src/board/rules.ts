import { isEmpty, isVisible } from '../forms/logic'
import type { Card, Field, FieldValue, Transition } from '../lib/types'

/** A phase with no outgoing transitions configured may move anywhere. */
export function canMove(transitions: Transition[], from: string, to: string) {
  if (from === to) return true
  const out = transitions.filter((t) => t.from_phase_id === from)
  return out.length === 0 || out.some((t) => t.to_phase_id === to)
}

export function allowedTargets(transitions: Transition[], from: string) {
  return transitions.filter((t) => t.from_phase_id === from).map((t) => t.to_phase_id)
}

/** Position between neighbours so only the moved card needs to be written. */
export function positionAt(list: Card[], index: number) {
  const prev = list[index - 1]?.position
  const next = list[index + 1]?.position
  if (prev === undefined && next === undefined) return 1000
  if (prev === undefined) return next! - 1000
  if (next === undefined) return prev + 1000
  return (prev + next) / 2
}

export function groupByPhase(cards: Card[], phaseIds: string[]) {
  const map: Record<string, Card[]> = Object.fromEntries(phaseIds.map((id) => [id, []]))
  for (const c of [...cards].sort((a, b) => a.position - b.position)) if (!c.family_of) (map[c.phase_id] ??= []).push(c) // members ride inside their holder
  return map
}

/** Required fields of a phase that are visible (conditions) and still empty. */
export function missingRequired(fields: Field[], phaseId: string, values: Record<string, FieldValue>) {
  return fields.filter((f) => f.phase_id === phaseId && f.required && f.type !== 'info' && isVisible(f, values) && isEmpty(values[f.id]))
}
