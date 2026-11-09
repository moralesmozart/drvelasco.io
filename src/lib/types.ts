export type FieldType =
  | 'short_text' | 'long_text' | 'info' | 'attachment' | 'checklist' | 'radio' | 'select'
  | 'date' | 'email' | 'phone' | 'number' | 'currency'

export interface Pipe {
  id: string
  name: string
  icon: string
  color: string
  form_slug: string
  form_settings: Record<string, unknown>
  created_at: string
}

export interface PipeSummary extends Pipe {
  card_count: number
}

export interface Phase {
  id: string
  pipe_id: string
  name: string
  color: string
  description: string | null
  position: number
  is_final: boolean
  translations?: { es?: { name?: string } }
}

export interface FieldCondition {
  field_id: string
  op: 'equals' | 'contains' | 'filled'
  value?: string
}

export interface Field {
  id: string
  pipe_id: string
  phase_id: string | null
  type: FieldType
  label: string
  description: string | null
  required: boolean
  options: string[]
  conditions: FieldCondition[]
  show_on_card: boolean
  position: number
  translations?: { es?: { label?: string; description?: string | null; options?: string[] } }
  /** Repeat this start-form question for each family member */
  per_person?: boolean
}

export interface AttachmentValue {
  path: string
  name: string
  size: number
  mime: string
}

export type FieldValue = string | number | string[] | AttachmentValue[] | null

export interface Card {
  id: string
  pipe_id: string
  phase_id: string
  title: string
  values: Record<string, FieldValue>
  position: number
  created_via: 'internal' | 'public_form' | 'import'
  phase_entered_at: string
  created_at: string
  updated_at: string
  /** Member of a family request: the holder card's id */
  family_of?: string | null
  /** Member: filha | filho | esposa | esposo | mae | pai | outro:<text>. Holder: 'contato' when only the contact person */
  relation?: string | null
}

export interface FamilyMemberInput {
  relation: string
  values: Record<string, FieldValue>
}

export interface Transition {
  from_phase_id: string
  to_phase_id: string
}

export interface Board {
  pipe: Pipe
  phases: Phase[]
  fields: Field[]
  cards: Card[]
  transitions: Transition[]
}

export type PhaseInput = Pick<Phase, 'name' | 'color' | 'description' | 'is_final' | 'translations'>

export interface FormSettings {
  title?: string
  description?: string
  brand_color?: string
  success_message?: string
  submit_label?: string
  /** Animated wordmark on the public form: small line above (e.g. a title) + main name */
  logo_kicker?: string
  logo_name?: string
  es?: { title?: string; description?: string; success_message?: string; submit_label?: string }
  /** Home page highlights: upcoming dates of a date field, for cards in some phases */
  dashboard?: { date_field_id?: string; phase_ids?: string[]; days?: number }
}

export interface PublicFormDef {
  pipe: { id: string; name: string; color: string; settings: FormSettings }
  fields: Field[]
}

export type FieldInput = Omit<Field, 'id' | 'pipe_id' | 'position'>

export interface CardEvent {
  id: string | number
  card_id: string
  type: 'created' | 'moved' | 'field_edited' | 'title_edited'
  payload: Record<string, unknown>
  created_at: string
}

export interface PdfPageSettings {
  lang: 'pt-BR' | 'es'
  margin: number // mm
}

export interface PdfTemplate {
  id: string
  pipe_id: string
  name: string
  content: Record<string, unknown> // TipTap JSON
  page: PdfPageSettings
  updated_at: string
}

export interface TeamMember {
  user_id: string
  email: string
  name: string | null
  avatar: { icon?: string; color?: string } | null
  last_sign_in_at: string | null
  last_seen_at: string | null
  created_at: string
}
