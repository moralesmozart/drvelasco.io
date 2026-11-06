import { repo } from './repo'
import type { Card, CardEvent, Field, FieldValue, PdfTemplate, Phase, Pipe, Transition } from './types'

/** A whole project in one file. "backup" includes cards + history; "structure" only the setup. */
export interface ProjectFile {
  format: 'drvelasco-project'
  version: 1
  kind: 'backup' | 'structure'
  exported_at: string
  pipe: Pick<Pipe, 'id' | 'name' | 'icon' | 'color' | 'form_slug' | 'form_settings'>
  phases: Phase[]
  fields: Field[]
  transitions: Transition[]
  templates: PdfTemplate[]
  cards?: Card[]
  events?: CardEvent[]
}

export type RestoreRows = ReturnType<typeof remapProject>

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'projeto'

export async function buildProjectFile(pipeId: string, kind: ProjectFile['kind']): Promise<ProjectFile> {
  const [board, templates, events] = await Promise.all([
    repo.getBoard(pipeId),
    repo.listTemplates(pipeId),
    kind === 'backup' ? repo.listPipeEvents(pipeId) : Promise.resolve([] as CardEvent[]),
  ])
  const { id, name, icon, color, form_slug, form_settings } = board.pipe
  return {
    format: 'drvelasco-project',
    version: 1,
    kind,
    exported_at: new Date().toISOString(),
    pipe: { id, name, icon, color, form_slug, form_settings },
    phases: board.phases,
    fields: board.fields,
    transitions: board.transitions,
    templates,
    ...(kind === 'backup' ? { cards: board.cards, events } : {}),
  }
}

export async function downloadProjectFile(pipeId: string, kind: ProjectFile['kind']) {
  const file = await buildProjectFile(pipeId, kind)
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `drvelasco-${kind === 'backup' ? 'backup' : 'estrutura'}-${slugify(file.pipe.name)}-${file.exported_at.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return file
}

export async function readProjectFile(file: File): Promise<ProjectFile> {
  const data = JSON.parse(await file.text()) as ProjectFile
  if (data?.format !== 'drvelasco-project' || !data.pipe || !Array.isArray(data.phases) || !Array.isArray(data.fields)) {
    throw new Error('invalid_file')
  }
  return data
}

/** Gives every record a fresh id (so it never collides with existing data) and rewires all references. */
export function remapProject(file: ProjectFile, name: string) {
  const id = () => crypto.randomUUID()
  const pipeId = id()
  const phaseIds = new Map(file.phases.map((p) => [p.id, id()]))
  const fieldIds = new Map(file.fields.map((f) => [f.id, id()]))
  const cardIds = new Map((file.cards ?? []).map((c) => [c.id, id()]))
  const ph = (x: unknown) => phaseIds.get(String(x)) ?? String(x)
  const fd = (x: unknown) => fieldIds.get(String(x)) ?? String(x)

  const remapDoc = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(remapDoc)
    if (node && typeof node === 'object') {
      const n = node as Record<string, unknown>
      if (n.type === 'fieldChip' && n.attrs && typeof n.attrs === 'object') {
        const attrs = n.attrs as Record<string, unknown>
        return { ...n, attrs: { ...attrs, key: String(attrs.key).startsWith('sys:') ? attrs.key : fd(attrs.key) } }
      }
      return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, remapDoc(v)]))
    }
    return node
  }

  return {
    pipe: { id: pipeId, name, icon: file.pipe.icon, color: file.pipe.color, form_slug: file.pipe.form_slug, form_settings: file.pipe.form_settings ?? {} },
    phases: file.phases.map((p) => ({
      id: phaseIds.get(p.id)!, pipe_id: pipeId, name: p.name, color: p.color, description: p.description,
      position: p.position, is_final: p.is_final, translations: p.translations ?? {},
    })),
    fields: file.fields.map((f) => ({
      id: fieldIds.get(f.id)!, pipe_id: pipeId, phase_id: f.phase_id ? ph(f.phase_id) : null, type: f.type, label: f.label,
      description: f.description, required: f.required, options: f.options ?? [], show_on_card: f.show_on_card, position: f.position,
      conditions: (f.conditions ?? []).map((c) => ({ ...c, field_id: fd(c.field_id) })),
      translations: f.translations ?? {},
      per_person: !!f.per_person,
    })),
    transitions: file.transitions
      .filter((t) => phaseIds.has(t.from_phase_id) && phaseIds.has(t.to_phase_id))
      .map((t) => ({ from_phase_id: ph(t.from_phase_id), to_phase_id: ph(t.to_phase_id) })),
    templates: (file.templates ?? []).map((t) => ({
      id: id(), pipe_id: pipeId, name: t.name, page: t.page, content: remapDoc(t.content) as Record<string, unknown>,
    })),
    cards: (file.cards ?? []).filter((c) => phaseIds.has(c.phase_id)).map((c) => ({
      id: cardIds.get(c.id)!, pipe_id: pipeId, phase_id: ph(c.phase_id), title: c.title, position: c.position,
      created_via: c.created_via, created_at: c.created_at, updated_at: c.updated_at, phase_entered_at: c.phase_entered_at,
      values: Object.fromEntries(Object.entries(c.values ?? {}).map(([k, v]) => [fd(k), v as FieldValue])),
      family_of: c.family_of ? cardIds.get(c.family_of) ?? null : null,
      relation: c.relation ?? null,
    })),
    events: (file.events ?? []).filter((e) => cardIds.has(e.card_id)).map((e) => {
      const p = { ...(e.payload ?? {}) } as Record<string, unknown>
      if (e.type === 'moved') { p.from = ph(p.from); p.to = ph(p.to) }
      if (e.type === 'created' && p.phase_id) p.phase_id = ph(p.phase_id)
      if (e.type === 'field_edited' && p.field_id) p.field_id = fd(p.field_id)
      return { card_id: cardIds.get(e.card_id)!, type: e.type, payload: p, created_at: e.created_at }
    }),
  }
}
