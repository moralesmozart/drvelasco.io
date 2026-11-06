import type { Field, FieldValue } from '../lib/types'
import { parsePhone } from './countries'

export function isEmpty(v: FieldValue | undefined) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)
}

/** Mirrors the SQL field_visible(): every condition must match. */
export function isVisible(field: Field, values: Record<string, FieldValue>) {
  return (field.conditions ?? []).every((c) => {
    const v = values[c.field_id]
    if (c.op === 'filled') return !isEmpty(v)
    const target = (c.value ?? '').toLowerCase()
    if (Array.isArray(v)) return v.some((x) => (typeof x === 'string' ? x : x.name).toLowerCase() === target)
    const s = String(v ?? '').toLowerCase()
    return c.op === 'equals' ? s === target : s.includes(target)
  })
}

export function validate(fields: Field[], values: Record<string, FieldValue>) {
  const errors: Record<string, 'required' | 'email' | 'phone'> = {}
  for (const f of fields) {
    if (f.type === 'info' || !isVisible(f, values)) continue
    const v = values[f.id]
    if (f.required && isEmpty(v)) { errors[f.id] = 'required'; continue }
    if (isEmpty(v)) continue
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v))) errors[f.id] = 'email'
    if (f.type === 'phone' && parsePhone(String(v)).number.length < 8) errors[f.id] = 'phone'
  }
  return errors
}

/** Keep only values of visible fields (hidden answers are never sent). */
export function visibleValues(fields: Field[], values: Record<string, FieldValue>) {
  const out: Record<string, FieldValue> = {}
  for (const f of fields) if (f.type !== 'info' && isVisible(f, values) && !isEmpty(values[f.id])) out[f.id] = values[f.id]
  return out
}
