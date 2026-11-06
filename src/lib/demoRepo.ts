import type { Repo } from './repo'
import type { Board, Card, Field, Phase, Pipe, PublicFormDef, Transition } from './types'
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
}

const KEY = 'drvelasco-demo-v2'
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
  const fields = [name, doc, due, phone, email, topics, other, files, contact, agree, notes, pay, value]

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
  const [inbox, doing, pending, paidA, paidB, done] = phases.map((p) => p.id)
  const transitions: Transition[] = [
    [inbox, doing], [doing, pending], [doing, paidA], [doing, paidB], [doing, done],
    [pending, paidA], [pending, paidB], [paidA, done], [paidB, done],
  ].map(([from_phase_id, to_phase_id]) => ({ from_phase_id, to_phase_id }))
  return { pipes: [pipe], phases, fields, cards, transitions }
}

let db: DemoDB = load()
const listeners = new Set<() => void>()

// Another tab (e.g. the public form) changed the demo data: reload it everywhere.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) { db = load(); listeners.forEach((l) => l()) }
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

export function resetDemo() {
  db = seed()
  save()
}

export const demoRepo: Repo = {
  async listPipes() {
    return delay(db.pipes.map((p) => ({ ...p, card_count: db.cards.filter((c) => c.pipe_id === p.id).length })))
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
      cards: db.cards.filter((c) => c.pipe_id === pipeId).sort((a, b) => a.position - b.position),
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
    save()
    return delay(card)
  },
  async moveCard(cardId, phaseId, position) {
    db.cards = db.cards.map((c) =>
      c.id === cardId
        ? { ...c, phase_id: phaseId, position, phase_entered_at: c.phase_id === phaseId ? c.phase_entered_at : now() }
        : c,
    )
    save()
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
  async submitPublicForm(slug, values, honeypot) {
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
    save()
  },
  subscribe(_pipeId, onChange) {
    listeners.add(onChange)
    return () => { listeners.delete(onChange) }
  },
}
