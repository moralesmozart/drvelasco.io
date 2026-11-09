import type { Field, FieldValue } from './types'
import { fieldText } from './localize'

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
  return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(0, 'second')
}

/** Ageing colour for the "time in phase" chip. */
export function ageTone(iso: string) {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000
  if (days >= 7) return 'text-rose-700 bg-rose-50'
  if (days >= 3) return 'text-amber-700 bg-amber-50'
  return 'text-slate-600 bg-slate-100'
}

export function formatValue(field: Field, value: FieldValue, lang: string, values?: Record<string, unknown>): string {
  if (value === null || value === undefined || value === '') return '—'
  const opt = fieldText(field, lang).option
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? opt(v) : v && typeof v === 'object' && 'name' in v ? String(v.name) : '')).filter(Boolean).join(', ') || '—'
  }
  if (typeof value === 'object') return '—'
  if (typeof value === 'string' && field.options.length && field.type !== 'currency') return opt(value)
  if (field.type === 'date' && typeof value === 'string') {
    const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
    return isNaN(d.getTime()) ? value : d.toLocaleDateString(lang)
  }
  if (field.type === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat(lang, { style: 'currency', currency: currencyOf(field, values) }).format(value)
  }
  return String(value)
}

export const CURRENCIES = ['EUR', 'BRL', 'USD'] as const

/**
 * Currency settings live in a currency field's options:
 *   ['BRL']                                    → always R$
 *   ['EUR', '@<fieldId>', 'pix=BRL', 'wise=EUR'] → follows the answer of another field, EUR otherwise
 */
export interface CurrencyRule { base: string; by?: string; map: Record<string, string> }

const ISO = /^[A-Z]{3}$/
export function currencyRule(field: { type: string; options: string[] }): CurrencyRule {
  const opts = field.type === 'currency' ? field.options : []
  const base = opts[0] && ISO.test(opts[0]) ? opts[0] : 'EUR'
  const by = opts.find((o) => o.startsWith('@'))?.slice(1) || undefined
  const map: Record<string, string> = {}
  for (const o of opts) {
    const i = o.lastIndexOf('=')
    if (i > 0 && ISO.test(o.slice(i + 1))) map[o.slice(0, i)] = o.slice(i + 1)
  }
  return { base, by, map }
}

export function ruleToOptions(r: CurrencyRule) {
  return [r.base, ...(r.by ? [`@${r.by}`, ...Object.entries(r.map).map(([k, v]) => `${k}=${v}`)] : [])]
}

/** The currency for this field on a given card (its values decide when there is a rule). */
export function currencyOf(field: { type: string; options: string[] }, values?: Record<string, unknown>) {
  const r = currencyRule(field)
  if (r.by && values) {
    const v = values[r.by]
    for (const item of Array.isArray(v) ? v : [v]) if (typeof item === 'string' && r.map[item]) return r.map[item]
  }
  return r.base
}

export function currencySymbol(code: string, lang = 'pt-BR') {
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency: code }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? code
  } catch { return code }
}
