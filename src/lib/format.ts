import type { Field, FieldValue } from './types'

export function timeSince(iso: string, lang: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    if (diff >= secs) {
      const n = Math.floor(diff / secs)
      return new Intl.NumberFormat(lang, { style: 'unit', unit, unitDisplay: 'long' }).format(n)
    }
  }
  return new Intl.NumberFormat(lang, { style: 'unit', unit: 'minute', unitDisplay: 'long' }).format(0)
}

/** Ageing colour for the "time in phase" chip. */
export function ageTone(iso: string) {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000
  if (days >= 7) return 'text-rose-700 bg-rose-50'
  if (days >= 3) return 'text-amber-700 bg-amber-50'
  return 'text-slate-600 bg-slate-100'
}

export function formatValue(field: Field, value: FieldValue, lang: string): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : v.name)).join(', ')
  if (field.type === 'date' && typeof value === 'string') {
    const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
    return isNaN(d.getTime()) ? value : d.toLocaleDateString(lang)
  }
  if (field.type === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(value)
  }
  return String(value)
}
