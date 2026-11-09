import type { FieldValue } from './types'

/**
 * Keeps only value shapes the app knows how to show: text, numbers, lists of text,
 * and lists of files ({path, name}). Anything else is dropped, so one malformed card
 * can never break the board.
 */
export function cleanValues(values: unknown): Record<string, FieldValue> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {}
  const out: Record<string, FieldValue> = {}
  for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
    if (v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) {
      out[k] = v as FieldValue
    } else if (Array.isArray(v)) {
      if (v.every((x) => typeof x === 'string')) out[k] = v as string[]
      else {
        const files = v.filter((x): x is { path: string; name: string; size?: unknown; mime?: unknown } =>
          !!x && typeof x === 'object' && typeof x.path === 'string' && typeof x.name === 'string')
        out[k] = files.map((x) => ({ path: x.path, name: x.name, size: Number(x.size) || 0, mime: typeof x.mime === 'string' ? x.mime : '' }))
      }
    }
  }
  return out
}
