import type { Card, Field, FieldValue } from './types'

export const RELATIONS = ['filha', 'filho', 'esposa', 'esposo', 'mae', 'pai', 'outro'] as const

/** "outro:Avó" → "Avó"; known keys → translated label. */
export function relationLabel(rel: string | null | undefined, t: (k: string) => string) {
  if (!rel) return ''
  if (rel.startsWith('outro:')) return rel.slice(6) || t('family.rel.outro')
  return t(`family.rel.${rel}`)
}

export const isMember = (c: Pick<Card, 'family_of'>) => !!c.family_of

/** Holder id → its members, in order. */
export function membersByHolder(cards: Card[]) {
  const map = new Map<string, Card[]>()
  for (const c of cards) if (c.family_of) (map.get(c.family_of) ?? map.set(c.family_of, []).get(c.family_of)!).push(c)
  for (const list of map.values()) list.sort((a, b) => a.position - b.position)
  return map
}

/** A member's values with the holder's shared answers filled in (for display and PDFs). */
export function withSharedValues(member: Card, holder: Card | undefined, fields: Field[]): Record<string, FieldValue> {
  if (!holder) return member.values
  const shared = Object.fromEntries(
    fields.filter((f) => !f.per_person && holder.values[f.id] !== undefined).map((f) => [f.id, holder.values[f.id]]),
  )
  return { ...shared, ...member.values }
}

/** Age in years from an ISO date (YYYY-MM-DD), or null. */
export function ageFrom(iso: unknown) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age >= 0 && age < 130 ? age : null
}
