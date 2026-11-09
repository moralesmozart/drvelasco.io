import { cleanValues } from './sanitize'
import type { Repo } from './repo'
import type { Board, Card, CardEvent, Field, FieldValue, PdfTemplate, Phase, Pipe, PublicFormDef, Transition } from './types'
import { DEFAULT_PHASES } from './defaults'

/**
 * Demo storage: lives in this browser (localStorage). Used when Supabase env vars are missing,
 * so the UI can be explored and tested without a backend. All names and data are fictional.
 */
interface DemoDB {
  pipes: Pipe[]
  phases: Phase[]
  fields: Field[]
  cards: Card[]
  transitions: Transition[]
  events?: CardEvent[]
  templates?: PdfTemplate[]
}

const KEY = 'drvelasco-demo-v6'
const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()

function seed(): DemoDB {
  const pipe: Pipe = {
    id: uid(), name: 'Solicitações', icon: 'clipboard', color: '#0d9488', form_slug: 'demo1234',
    form_settings: {
      title: 'Nova solicitação',
      description: 'Preencha o formulário e entraremos em contato o quanto antes.',
      brand_color: '#8bbcb4',
      success_message: 'Recebemos sua solicitação! Entraremos em contato em breve.',
      es: {
        title: 'Nueva solicitud',
        description: 'Rellena el formulario y nos pondremos en contacto lo antes posible.',
        success_message: '¡Hemos recibido tu solicitud! Te contactaremos pronto.',
      },
    },
    created_at: now(),
  }
  const ph = (name: string, color: string, position: number, is_final = false): Phase => ({
    id: uid(), pipe_id: pipe.id, name, color, description: null, position, is_final,
  })
  const phases = [
    ph('Caixa de entrada', '#65a30d', 0), ph('Em andamento', '#2563eb', 1), ph('Aguardando pagamento', '#7c3aed', 2),
    ph('Pago (transferência)', '#475569', 3), ph('Pago (cartão)', '#4f46e5', 4), ph('Concluído', '#16a34a', 5, true),
  ]
  const f = (label: string, type: Field['type'], position: number, extra: Partial<Field> = {}): Field => ({
    id: uid(), pipe_id: pipe.id, phase_id: null, type, label, description: null, required: false,
    options: [], conditions: [], show_on_card: false, position, ...extra,
  })
  const name = f('Nome completo', 'short_text', 0, { required: true, show_on_card: true })
  const doc = f('Número do documento', 'short_text', 1, { required: true, show_on_card: true })
  const due = f('Data desejada', 'date', 2, { show_on_card: true })
  const phone = f('Telefone (WhatsApp)', 'phone', 3, { description: 'Com código do país. Usaremos apenas para atendimento.' })
  const email = f('E-mail', 'email', 4)
  const topics = f('Quais serviços você precisa?', 'checklist', 5, { options: ['Consultoria', 'Documentação', 'Tradução', 'Outro'] })
  const other = f('Descreva o outro serviço', 'short_text', 6, {
    conditions: [{ field_id: topics.id, op: 'contains', value: 'Outro' }],
  })
  const files = f('Anexos', 'attachment', 7, { description: 'Opcional. Imagens ou PDF, até 10 MB.' })
  const contact = f('Como prefere seguir?', 'radio', 8, { options: ['Videochamada', 'Telefone', 'Só por mensagem'] })
  const agree = f('Você declara que as informações são verdadeiras?', 'radio', 9, { required: true, options: ['Sim'] })
  const notes = { ...f('Notas internas', 'long_text', 0), phase_id: phases[1].id }
  const pay = { ...f('Forma de pagamento', 'checklist', 1, { required: true, options: ['Transferência', 'Cartão', 'Outro'] }), phase_id: phases[1].id }
  const value = { ...f('Valor', 'currency', 2), phase_id: phases[1].id }
  const birth = f('Data de nascimento', 'date', 1.5, { per_person: true })
  for (const pf of [name, doc, files]) pf.per_person = true
  const fields = [name, doc, birth, due, phone, email, topics, other, files, contact, agree, notes, pay, value]
  const es: Array<[Field, string, string[]?, string?]> = [
    [name, 'Nombre completo'], [doc, 'Número de documento'], [due, 'Fecha deseada'],
    [birth, 'Fecha de nacimiento'], [phone, 'Teléfono (WhatsApp)', undefined, 'Con código de país. Solo lo usaremos para la atención.'], [email, 'Correo electrónico'],
    [topics, '¿Qué servicios necesitas?', ['Consultoría', 'Documentación', 'Traducción', 'Otro']],
    [other, 'Describe el otro servicio'], [files, 'Adjuntos', undefined, 'Opcional. Imágenes o PDF, hasta 10 MB.'],
    [contact, '¿Cómo prefieres seguir?', ['Videollamada', 'Teléfono', 'Solo por mensaje']],
    [agree, '¿Declaras que la información es verdadera?', ['Sí']],
    [notes, 'Notas internas'], [pay, 'Forma de pago', ['Transferencia', 'Tarjeta', 'Otro']], [value, 'Valor'],
  ]
  for (const [fl, label, options, description] of es) fl.translations = { es: { label, options, description } }
  const phaseEs = ['Bandeja de entrada', 'En curso', 'Pendiente de pago', 'Pagado (transferencia)', 'Pagado (tarjeta)', 'Completado']
  phases.forEach((p, i) => { p.translations = { es: { name: phaseEs[i] } } })

  const people: Array<[string, string, string, number, number]> = [
    // name, document, date, phase index, days in phase
    ['Lucas Ferreira Andrade', 'DOC102938', '2026-11-13', 1, 8],
    ['Beatriz Moura Lima', 'DOC564738', '2026-11-20', 1, 2],
    ['Rafaela Nunes Teixeira', 'DOC918273', '2026-12-20', 2, 5],
    ['Gustavo Pires Almeida', 'DOC283746', '2026-10-26', 3, 11],
    ['Helena Duarte Rocha', 'DOC736451', '2026-11-02', 3, 4],
    ['Mateus Carvalho Dias', 'DOC019283', '2027-02-11', 4, 3],
    ['Juliana Prado Campos', 'DOC647382', '2026-11-06', 4, 1],
    ['Thiago Barros Freitas', 'DOC564321', '2026-10-15', 5, 20],
  ]
  const cards: Card[] = people.map(([n, p, a, phase, d], i) => ({
    id: uid(), pipe_id: pipe.id, phase_id: phases[phase].id, title: n,
    values: { [name.id]: n, [doc.id]: p, [due.id]: a },
    position: (i + 1) * 1000, created_via: 'public_form', phase_entered_at: daysAgo(d),
    created_at: daysAgo(d + 3), updated_at: daysAgo(d),
  }))
  // a demo family: Juliana with two children
  const holder = cards.find((c) => c.title === 'Juliana Prado Campos')!
  ;[['Ana Prado Campos', 'DOC647383', '2017-05-12', 'filha'], ['Pedro Prado Campos', 'DOC647384', '2020-09-03', 'filho']].forEach(([n, d, b, rel], i) => {
    cards.push({
      ...holder, id: uid(), title: n, values: { [name.id]: n, [doc.id]: d, [birth.id]: b }, position: holder.position + i + 1,
      family_of: holder.id, relation: rel,
    })
  })
  const [inbox, doing, pending, paidA, paidB, done] = phases.map((p) => p.id)
  const transitions: Transition[] = [
    [inbox, doing], [doing, pending], [doing, paidA], [doing, paidB], [doing, done],
    [pending, paidA], [pending, paidB], [paidA, done], [paidB, done],
  ].map(([from_phase_id, to_phase_id]) => ({ from_phase_id, to_phase_id }))
  const events: CardEvent[] = cards.flatMap((c) => [
    { id: uid(), card_id: c.id, type: 'created' as const, payload: { phase_id: phases[0].id, via: 'public_form' }, created_at: c.created_at },
    ...(c.phase_id !== phases[0].id
      ? [{ id: uid(), card_id: c.id, type: 'moved' as const, payload: { from: phases[0].id, to: c.phase_id }, created_at: c.phase_entered_at }]
      : []),
  ])
  const chip = (key: string, label: string) => ({ type: 'fieldChip', attrs: { key, label } })
  const txt = (text: string, marks?: unknown[]) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
  const templates: PdfTemplate[] = [{
    id: uid(), pipe_id: pipe.id, name: 'Declaração (exemplo)', updated_at: now(),
    page: { lang: 'pt-BR', margin: 20 },
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [txt('DECLARAÇÃO')] },
        { type: 'horizontalRule' },
        { type: 'paragraph' },
        { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [
          txt('Declaramos para os devidos fins que '), { ...chip(name.id, name.label), marks: [{ type: 'bold' }] },
          txt(', portador(a) do documento nº '), { ...chip(doc.id, doc.label), marks: [{ type: 'bold' }] },
          txt(', realizou sua solicitação nesta data, com previsão para '), chip(due.id, due.label), txt('.'),
        ] },
        { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [txt('Esta declaração é válida até '), chip('sys:valid_90', 'Válido até (+90 dias)'), txt('.')] },
        { type: 'paragraph' },
        { type: 'paragraph', attrs: { textAlign: 'right' }, content: [txt('Emitido em '), chip('sys:today_long', 'Data de hoje (por extenso)')] },
        { type: 'paragraph' }, { type: 'paragraph' },
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [txt('______________________________________')] },
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [txt('Assinatura e carimbo', [{ type: 'italic' }])] },
      ],
    },
  }]
  return { pipes: [pipe], phases, fields, cards, transitions, events, templates }
}

let db: DemoDB = load()
const listeners = new Set<() => void>()

// Another tab (e.g. the public form) changed the demo data: reload it everywhere.
const newCardListeners = new Set<(c: Card) => void>()
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  const before = new Set(db.cards.map((c) => c.id))
  db = load()
  listeners.forEach((l) => l())
  db.cards.filter((c) => !before.has(c.id) && c.created_via === 'public_form' && !c.family_of).forEach((c) => newCardListeners.forEach((l) => l(c)))
})

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DemoDB
  } catch { /* storage unavailable: fall through to fresh seed */ }
  return seed()
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120))

function logEvent(card_id: string, type: CardEvent['type'], payload: Record<string, unknown>) {
  ;(db.events ??= []).push({ id: uid(), card_id, type, payload, created_at: now() })
}

export function resetDemo() {
  db = seed()
  save()
}

export const demoRepo: Repo = {
  async listTeam() {
    let name = 'Demo'
    let avatar = null
    try { name = localStorage.getItem('demo-name') || 'Demo'; avatar = JSON.parse(localStorage.getItem('demo-avatar') || 'null') } catch { /* ignore */ }
    const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()
    return delay([
      { user_id: 'demo', email: 'demo@example.com', name, avatar, last_sign_in_at: ago(60 * 3), last_seen_at: ago(0), created_at: ago(60 * 24 * 30) },
      { user_id: 'demo-2', email: 'equipe@example.com', name: 'Assistente', avatar: { icon: 'heart-pulse', color: 'violet' }, last_sign_in_at: ago(60 * 26), last_seen_at: ago(60 * 25), created_at: ago(60 * 24 * 12) },
    ])
  },
  async listPipes() {
    return delay(db.pipes.map((p) => ({ ...p, card_count: db.cards.filter((c) => c.pipe_id === p.id && !c.family_of).length })))
  },
  async createPipe(input) {
    const pipe: Pipe = { ...input, id: uid(), form_slug: uid().slice(0, 8), form_settings: {}, created_at: now() }
    db.pipes.push(pipe)
    DEFAULT_PHASES.forEach((p, i) =>
      db.phases.push({ ...p, id: uid(), pipe_id: pipe.id, description: null, position: i }),
    )
    save()
    return delay(pipe)
  },
  async updatePipe(id, patch) {
    db.pipes = db.pipes.map((p) => (p.id === id ? { ...p, ...patch } : p))
    save()
  },
  async deletePipe(id) {
    const phaseIds = new Set(db.phases.filter((p) => p.pipe_id === id).map((p) => p.id))
    db = {
      pipes: db.pipes.filter((p) => p.id !== id),
      phases: db.phases.filter((p) => p.pipe_id !== id),
      fields: db.fields.filter((f) => f.pipe_id !== id),
      cards: db.cards.filter((c) => c.pipe_id !== id),
      transitions: db.transitions.filter((t) => !phaseIds.has(t.from_phase_id)),
    }
    save()
  },
  async getBoard(pipeId) {
    const pipe = db.pipes.find((p) => p.id === pipeId)
    if (!pipe) throw new Error('Pipe não encontrado')
    const phases = db.phases.filter((p) => p.pipe_id === pipeId).sort((a, b) => a.position - b.position)
    const ids = new Set(phases.map((p) => p.id))
    const board: Board = {
      pipe,
      phases,
      fields: db.fields.filter((f) => f.pipe_id === pipeId).sort((a, b) => a.position - b.position),
      cards: db.cards.filter((c) => c.pipe_id === pipeId).sort((a, b) => a.position - b.position).map((c) => ({ ...c, values: cleanValues(c.values) })),
      transitions: db.transitions.filter((t) => ids.has(t.from_phase_id)),
    }
    return delay(board)
  },
  async createPhase(pipeId, input, position) {
    const phase: Phase = { ...input, id: uid(), pipe_id: pipeId, position }
    db.phases.push(phase)
    save()
    return delay(phase)
  },
  async updatePhase(id, patch) {
    db.phases = db.phases.map((p) => (p.id === id ? { ...p, ...patch } : p))
    save()
  },
  async reorderPhases(orderedIds) {
    db.phases = db.phases.map((p) => (orderedIds.includes(p.id) ? { ...p, position: orderedIds.indexOf(p.id) } : p))
    save()
  },
  async deletePhase(id, moveCardsTo) {
    if (moveCardsTo) {
      db.cards = db.cards.map((c) => (c.phase_id === id ? { ...c, phase_id: moveCardsTo, phase_entered_at: now() } : c))
    } else if (db.cards.some((c) => c.phase_id === id)) {
      throw new Error('A fase ainda tem cards')
    }
    db.phases = db.phases.filter((p) => p.id !== id)
    db.fields = db.fields.filter((f) => f.phase_id !== id)
    db.transitions = db.transitions.filter((t) => t.from_phase_id !== id && t.to_phase_id !== id)
    save()
  },
  async createCard(pipeId, phaseId, title, values) {
    const max = Math.max(0, ...db.cards.filter((c) => c.phase_id === phaseId).map((c) => c.position))
    const card: Card = {
      id: uid(), pipe_id: pipeId, phase_id: phaseId, title, values, position: max + 1000,
      created_via: 'internal', phase_entered_at: now(), created_at: now(), updated_at: now(),
    }
    db.cards.push(card)
    logEvent(card.id, 'created', { phase_id: phaseId, via: 'internal' })
    save()
    return delay(card)
  },
  async moveCard(cardId, phaseId, position) {
    const before = db.cards.find((c) => c.id === cardId)
    if (before && before.phase_id !== phaseId) logEvent(cardId, 'moved', { from: before.phase_id, to: phaseId })
    // family members follow their holder
    for (const m of db.cards.filter((c) => c.family_of === cardId && c.phase_id !== phaseId)) {
      logEvent(m.id, 'moved', { from: m.phase_id, to: phaseId })
      m.phase_id = phaseId
      m.phase_entered_at = now()
    }
    db.cards = db.cards.map((c) =>
      c.id === cardId
        ? { ...c, phase_id: phaseId, position, phase_entered_at: c.phase_id === phaseId ? c.phase_entered_at : now() }
        : c,
    )
    save()
  },
  async updateCard(cardId, patch) {
    const c = db.cards.find((x) => x.id === cardId)
    if (!c) return
    if (patch.title !== undefined && patch.title !== c.title) logEvent(cardId, 'title_edited', { old: c.title, new: patch.title })
    if (patch.values) {
      const keys = new Set([...Object.keys(c.values), ...Object.keys(patch.values)])
      for (const k of keys) {
        if (JSON.stringify(c.values[k] ?? null) !== JSON.stringify(patch.values[k] ?? null)) {
          logEvent(cardId, 'field_edited', { field_id: k, old: c.values[k] ?? null, new: patch.values[k] ?? null })
        }
      }
    }
    db.cards = db.cards.map((x) => (x.id === cardId ? { ...x, ...patch, updated_at: now() } : x))
    save()
  },
  async getCardEvents(cardId) {
    return delay((db.events ?? []).filter((e) => e.card_id === cardId).sort((a, b) => b.created_at.localeCompare(a.created_at)))
  },
  async uploadCardFile(_cardId, file) {
    await new Promise((r) => setTimeout(r, 300))
    return { path: `demo/${uid()}`, name: file.name, size: file.size, mime: file.type }
  },
  async getFileUrl() {
    return null // demo mode keeps no files
  },
  async deleteCard(cardId) {
    db.cards = db.cards.filter((c) => c.id !== cardId)
    save()
  },
  async updateFormSettings(pipeId, settings) {
    db.pipes = db.pipes.map((p) => (p.id === pipeId ? { ...p, form_settings: settings as Record<string, unknown> } : p))
    save()
  },
  async createField(pipeId, input, position) {
    const field: Field = { ...input, id: uid(), pipe_id: pipeId, position }
    db.fields.push(field)
    save()
    return delay(field)
  },
  async updateField(id, patch) {
    db.fields = db.fields.map((f) => (f.id === id ? { ...f, ...patch } : f))
    save()
  },
  async deleteField(id) {
    db.fields = db.fields
      .filter((f) => f.id !== id)
      .map((f) => ({ ...f, conditions: f.conditions.filter((c) => c.field_id !== id) }))
    save()
  },
  async reorderFields(orderedIds) {
    db.fields = db.fields.map((f) => (orderedIds.includes(f.id) ? { ...f, position: orderedIds.indexOf(f.id) } : f))
    save()
  },
  async listPipeEvents(pipeId) {
    const ids = new Set(db.cards.filter((c) => c.pipe_id === pipeId).map((c) => c.id))
    return delay((db.events ?? []).filter((e) => ids.has(e.card_id)).sort((a, b) => a.created_at.localeCompare(b.created_at)))
  },
  async importCards(pipeId, cards) {
    cards.forEach((c, i) => {
      const at = c.created_at ?? now()
      const card: Card = {
        id: uid(), pipe_id: pipeId, phase_id: c.phase_id, title: c.title, values: c.values, position: (i + 1) * 1000,
        created_via: 'import', phase_entered_at: at, created_at: at, updated_at: at,
      }
      db.cards.push(card)
      logEvent(card.id, 'created', { phase_id: c.phase_id, via: 'import' })
    })
    save()
    return delay(cards.length)
  },
  async restoreProject(rows) {
    const slugTaken = db.pipes.some((p) => p.form_slug === rows.pipe.form_slug)
    db.pipes.push({ ...rows.pipe, form_slug: slugTaken ? uid().slice(0, 8) : rows.pipe.form_slug, created_at: now() } as Pipe)
    db.phases.push(...(rows.phases as Phase[]))
    db.fields.push(...(rows.fields as Field[]))
    db.transitions.push(...rows.transitions)
    ;(db.templates ??= []).push(...rows.templates.map((t) => ({ ...t, updated_at: now() }) as PdfTemplate))
    db.cards.push(...(rows.cards as Card[]))
    ;(db.events ??= []).push(...rows.events.map((e) => ({ ...e, id: uid() }) as CardEvent))
    save()
    return delay(rows.pipe.id)
  },
  async listTemplates(pipeId) {
    return delay((db.templates ?? []).filter((t) => t.pipe_id === pipeId))
  },
  async createTemplate(pipeId, input) {
    const tpl: PdfTemplate = { ...input, id: uid(), pipe_id: pipeId, updated_at: now() }
    ;(db.templates ??= []).push(tpl)
    save()
    return delay(tpl)
  },
  async updateTemplate(id, patch) {
    db.templates = (db.templates ?? []).map((t) => (t.id === id ? { ...t, ...patch, updated_at: now() } : t))
    save()
  },
  async deleteTemplate(id) {
    db.templates = (db.templates ?? []).filter((t) => t.id !== id)
    save()
  },
  async getPublicForm(slug) {
    const pipe = db.pipes.find((p) => p.form_slug === slug)
    if (!pipe) return delay(null)
    const def: PublicFormDef = {
      pipe: { id: pipe.id, name: pipe.name, color: pipe.color, settings: pipe.form_settings },
      fields: db.fields.filter((f) => f.pipe_id === pipe.id && f.phase_id === null).sort((a, b) => a.position - b.position),
    }
    return delay(def)
  },
  async uploadPublicFile(_slug, file) {
    // Demo: nothing is uploaded, only the file name is kept.
    await new Promise((r) => setTimeout(r, 400))
    return { path: `incoming/${uid()}`, name: file.name, size: file.size, mime: file.type }
  },
  async addFamilyMember(holder, relation, title, values) {
    const card: Card = {
      id: uid(), pipe_id: holder.pipe_id, phase_id: holder.phase_id, title, values, position: holder.position + 1,
      created_via: 'internal', phase_entered_at: now(), created_at: now(), updated_at: now(), family_of: holder.id, relation,
    }
    db.cards.push(card)
    logEvent(card.id, 'created', { phase_id: holder.phase_id, via: 'internal' })
    save()
    return delay(card)
  },
  async submitPublicForm(slug, values, honeypot, _captcha, family) {
    if (honeypot) return
    const pipe = db.pipes.find((p) => p.form_slug === slug)
    if (!pipe) throw new Error('form_not_found')
    const first = db.phases.filter((p) => p.pipe_id === pipe.id).sort((a, b) => a.position - b.position)[0]
    const titleField = db.fields
      .filter((f) => f.pipe_id === pipe.id && f.phase_id === null && f.type === 'short_text')
      .sort((a, b) => a.position - b.position)[0]
    const title = String((titleField && values[titleField.id]) || 'Novo card')
    const max = Math.max(0, ...db.cards.filter((c) => c.phase_id === first.id).map((c) => c.position))
    db.cards.push({
      id: uid(), pipe_id: pipe.id, phase_id: first.id, title, values, position: max + 1000,
      created_via: 'public_form', phase_entered_at: now(), created_at: now(), updated_at: now(),
    })
    const holder = db.cards[db.cards.length - 1]
    logEvent(holder.id, 'created', { phase_id: first.id, via: 'public_form' })
    if (family?.members.length) {
      if (!family.holderNeeds) holder.relation = 'contato'
      const perPerson = new Set(db.fields.filter((f) => f.pipe_id === pipe.id && f.phase_id === null && f.per_person).map((f) => f.id))
      family.members.forEach((m, i) => {
        const vals = Object.fromEntries(Object.entries(m.values).filter(([k]) => perPerson.has(k))) as Record<string, FieldValue>
        const card: Card = {
          id: uid(), pipe_id: pipe.id, phase_id: first.id, title: String((titleField && vals[titleField.id]) || 'Novo card'), values: vals,
          position: holder.position + i + 1, created_via: 'public_form', phase_entered_at: now(), created_at: now(), updated_at: now(),
          family_of: holder.id, relation: m.relation,
        }
        db.cards.push(card)
        logEvent(card.id, 'created', { phase_id: first.id, via: 'public_form' })
      })
    }
    save()
  },
  onNewCard(cb) {
    newCardListeners.add(cb)
    return () => { newCardListeners.delete(cb) }
  },
  subscribe(_pipeId, onChange) {
    listeners.add(onChange)
    return () => { listeners.delete(onChange) }
  },
}
