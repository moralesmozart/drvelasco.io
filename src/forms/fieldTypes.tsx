import {
  AlignLeft, AtSign, CalendarDays, CircleDot, Euro, Hash, Info, ListChecks, ChevronDownSquare, Paperclip, Phone, Type,
  type LucideIcon,
} from 'lucide-react'
import type { FieldType } from '../lib/types'

export const FIELD_TYPES: Array<{ type: FieldType; icon: LucideIcon; hasOptions?: boolean }> = [
  { type: 'short_text', icon: Type },
  { type: 'long_text', icon: AlignLeft },
  { type: 'email', icon: AtSign },
  { type: 'phone', icon: Phone },
  { type: 'date', icon: CalendarDays },
  { type: 'number', icon: Hash },
  { type: 'currency', icon: Euro },
  { type: 'radio', icon: CircleDot, hasOptions: true },
  { type: 'checklist', icon: ListChecks, hasOptions: true },
  { type: 'select', icon: ChevronDownSquare, hasOptions: true },
  { type: 'attachment', icon: Paperclip },
  { type: 'info', icon: Info },
]

export const fieldMeta = (t: FieldType) => FIELD_TYPES.find((f) => f.type === t) ?? FIELD_TYPES[0]
