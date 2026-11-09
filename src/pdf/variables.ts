import { formatValue } from '../lib/format'
import type { Card, Field, FieldValue } from '../lib/types'

/** Built-in variables available in every template. */
export const SYSTEM_VARS = ['sys:today', 'sys:today_long', 'sys:valid_90', 'sys:card_title', 'sys:created_at'] as const

export interface RenderContext {
  card: Card
  fields: Field[]
  lang: string
  now?: Date
}

function longDate(d: Date, lang: string) {
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Resolve a chip key to the text that goes into the document ('' when empty). */
export function resolveKey(key: string, ctx: RenderContext): string {
  const now = ctx.now ?? new Date()
  switch (key) {
    case 'sys:today': return now.toLocaleDateString(ctx.lang)
    case 'sys:today_long': return longDate(now, ctx.lang)
    case 'sys:valid_90': return new Date(now.getTime() + 90 * 86400000).toLocaleDateString(ctx.lang)
    case 'sys:card_title': return ctx.card.title
    case 'sys:created_at': return new Date(ctx.card.created_at).toLocaleDateString(ctx.lang)
  }
  const f = ctx.fields.find((x) => x.id === key)
  if (!f) return ''
  const v = ctx.card.values[f.id] as FieldValue | undefined
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return ''
  return formatValue(f, v, ctx.lang, ctx.card.values)
}

/** Keys used in a TipTap document. */
export function collectKeys(node: unknown, out = new Set<string>()): Set<string> {
  const n = node as { type?: string; attrs?: { key?: string }; content?: unknown[] }
  if (n?.type === 'fieldChip' && n.attrs?.key) out.add(n.attrs.key)
  n?.content?.forEach((c) => collectKeys(c, out))
  return out
}
