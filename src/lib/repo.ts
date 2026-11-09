import { cleanValues } from './sanitize'
import type {
  AttachmentValue, Board, Card, CardEvent, FamilyMemberInput, Field, PdfTemplate, FieldInput, FieldValue, FormSettings, Phase, PhaseInput, Pipe, PipeSummary, PublicFormDef, TeamMember,
} from './types'
import { supabase, isSupabaseConfigured } from './supabase'
import { demoRepo } from './demoRepo'
import { DEFAULT_PHASES } from './defaults'
import type { RestoreRows } from './projectFile'

/** Everything the UI needs from storage. Two implementations: Supabase and an in-browser demo. */
export interface Repo {
  listPipes(): Promise<PipeSummary[]>
  listTeam(): Promise<TeamMember[]>
  createPipe(input: Pick<Pipe, 'name' | 'icon' | 'color'>): Promise<Pipe>
  updatePipe(id: string, patch: Partial<Pick<Pipe, 'name' | 'icon' | 'color'>>): Promise<void>
  deletePipe(id: string): Promise<void>

  getBoard(pipeId: string): Promise<Board>

  createPhase(pipeId: string, input: PhaseInput, position: number): Promise<Phase>
  updatePhase(id: string, patch: Partial<PhaseInput>): Promise<void>
  reorderPhases(orderedIds: string[]): Promise<void>
  /** Moves all cards of `id` into `moveCardsTo` (if any), then deletes the phase. */
  deletePhase(id: string, moveCardsTo: string | null): Promise<void>

  createCard(pipeId: string, phaseId: string, title: string, values: Record<string, FieldValue>): Promise<Card>
  moveCard(cardId: string, phaseId: string, position: number): Promise<void>
  deleteCard(cardId: string): Promise<void>
  updateCard(cardId: string, patch: { title?: string; values?: Record<string, FieldValue> }): Promise<void>
  getCardEvents(cardId: string): Promise<CardEvent[]>
  uploadCardFile(cardId: string, file: File): Promise<AttachmentValue>
  /** Short-lived link to view a private file. */
  getFileUrl(path: string): Promise<string | null>

  updateFormSettings(pipeId: string, settings: FormSettings): Promise<void>
  createField(pipeId: string, input: FieldInput, position: number): Promise<Field>
  updateField(id: string, patch: Partial<FieldInput>): Promise<void>
  deleteField(id: string): Promise<void>
  reorderFields(orderedIds: string[]): Promise<void>

  /** All history events of a pipe (for reports). */
  listPipeEvents(pipeId: string): Promise<CardEvent[]>
  /** Bulk insert (import). Returns how many were created. */
  importCards(pipeId: string, cards: Array<Pick<Card, 'phase_id' | 'title' | 'values'> & { created_at?: string }>): Promise<number>
  /** Creates a new pipe from remapped export rows. Returns the new pipe id. */
  restoreProject(rows: RestoreRows): Promise<string>
  listTemplates(pipeId: string): Promise<PdfTemplate[]>
  createTemplate(pipeId: string, input: Pick<PdfTemplate, 'name' | 'content' | 'page'>): Promise<PdfTemplate>
  updateTemplate(id: string, patch: Partial<Pick<PdfTemplate, 'name' | 'content' | 'page'>>): Promise<void>
  deleteTemplate(id: string): Promise<void>

  /** Public (no login) */
  getPublicForm(slug: string): Promise<PublicFormDef | null>
  uploadPublicFile(slug: string, file: File): Promise<AttachmentValue>
  submitPublicForm(
    slug: string, values: Record<string, FieldValue>, honeypot: string, captchaToken?: string,
    family?: { members: FamilyMemberInput[]; holderNeeds: boolean },
  ): Promise<void>
  /** Adds a member to a family request (internal). */
  addFamilyMember(holder: Card, relation: string, title: string, values: Record<string, FieldValue>): Promise<Card>

  /** Called when a card arrives from the public form (any pipe). Returns unsubscribe. */
  onNewCard(cb: (card: Card) => void): () => void

  /** Calls back whenever cards/phases of the pipe change elsewhere. Returns unsubscribe. */
  subscribe(pipeId: string, onChange: () => void): () => void
}

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error
  return res.data
}

const supabaseRepo: Repo = {
  async listTeam() {
    return check(await supabase!.rpc('list_team')) as TeamMember[]
  },
  async listPipes() {
    const pipes = check(await supabase!.from('pipes').select('*, cards(count)').is('cards.family_of', null).order('created_at')) as Array<
      Pipe & { cards: { count: number }[] }
    >
    return pipes.map(({ cards, ...p }) => ({ ...p, card_count: cards?.[0]?.count ?? 0 }))
  },
  async createPipe(input) {
    const pipe = check(await supabase!.from('pipes').insert(input).select().single()) as Pipe
    check(
      await supabase!
        .from('phases')
        .insert(DEFAULT_PHASES.map((p, i) => ({ ...p, pipe_id: pipe.id, position: i }))),
    )
    return pipe
  },
  async updatePipe(id, patch) {
    check(await supabase!.from('pipes').update(patch).eq('id', id))
  },
  async deletePipe(id) {
    // cards reference phases with ON DELETE RESTRICT, so remove cards first
    check(await supabase!.from('cards').delete().eq('pipe_id', id))
    check(await supabase!.from('pipes').delete().eq('id', id))
  },

  async getBoard(pipeId) {
    const [pipe, phases, fields, cards] = await Promise.all([
      supabase!.from('pipes').select('*').eq('id', pipeId).single(),
      supabase!.from('phases').select('*').eq('pipe_id', pipeId).order('position'),
      supabase!.from('fields').select('*').eq('pipe_id', pipeId).order('position'),
      supabase!.from('cards').select('*').eq('pipe_id', pipeId).order('position'),
    ])
    const phaseRows = check(phases) as Phase[]
    const transitions = phaseRows.length
      ? check(
          await supabase!
            .from('phase_transitions')
            .select('*')
            .in('from_phase_id', phaseRows.map((p) => p.id)),
        )
      : []
    return {
      pipe: check(pipe) as Pipe,
      phases: phaseRows,
      fields: check(fields) as Board['fields'],
      cards: (check(cards) as Card[]).map((c) => ({ ...c, values: cleanValues(c.values) })),
      transitions: transitions as Board['transitions'],
    }
  },

  async createPhase(pipeId, input, position) {
    return check(
      await supabase!.from('phases').insert({ ...input, pipe_id: pipeId, position }).select().single(),
    ) as Phase
  },
  async updatePhase(id, patch) {
    check(await supabase!.from('phases').update(patch).eq('id', id))
  },
  async reorderPhases(orderedIds) {
    await Promise.all(
      orderedIds.map((id, i) => supabase!.from('phases').update({ position: i }).eq('id', id).then(check)),
    )
  },
  async deletePhase(id, moveCardsTo) {
    if (moveCardsTo) check(await supabase!.from('cards').update({ phase_id: moveCardsTo }).eq('phase_id', id))
    check(await supabase!.from('phases').delete().eq('id', id))
  },

  async createCard(pipeId, phaseId, title, values) {
    const { data: last } = await supabase!
      .from('cards')
      .select('position')
      .eq('phase_id', phaseId)
      .order('position', { ascending: false })
      .limit(1)
    const position = (last?.[0]?.position ?? 0) + 1000
    return check(
      await supabase!
        .from('cards')
        .insert({ pipe_id: pipeId, phase_id: phaseId, title, values, position })
        .select()
        .single(),
    ) as Card
  },
  async moveCard(cardId, phaseId, position) {
    check(await supabase!.from('cards').update({ phase_id: phaseId, position }).eq('id', cardId))
  },
  async deleteCard(cardId) {
    check(await supabase!.from('cards').delete().eq('id', cardId))
  },

  async updateCard(cardId, patch) {
    check(await supabase!.from('cards').update(patch).eq('id', cardId))
  },
  async getCardEvents(cardId) {
    return check(
      await supabase!.from('card_events').select('*').eq('card_id', cardId).order('created_at', { ascending: false }).limit(200),
    ) as CardEvent[]
  },
  async uploadCardFile(cardId, file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `cards/${cardId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase!.storage.from('attachments').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return { path, name: file.name, size: file.size, mime: file.type }
  },
  async getFileUrl(path) {
    const { data } = await supabase!.storage.from('attachments').createSignedUrl(path, 300)
    return data?.signedUrl ?? null
  },

  async listPipeEvents(pipeId) {
    const rows = check(
      await supabase!.from('card_events').select('*, cards!inner(pipe_id)').eq('cards.pipe_id', pipeId).order('created_at').limit(10000),
    ) as Array<CardEvent & { cards?: unknown }>
    return rows.map(({ cards: _c, ...e }) => { void _c; return e })
  },
  async importCards(pipeId, cards) {
    let n = 0
    for (let i = 0; i < cards.length; i += 200) {
      const chunk = cards.slice(i, i + 200).map((c, j) => ({
        pipe_id: pipeId, phase_id: c.phase_id, title: c.title, values: c.values, created_via: 'import',
        position: (i + j + 1) * 1000,
        ...(c.created_at ? { created_at: c.created_at, phase_entered_at: c.created_at } : {}),
      }))
      check(await supabase!.from('cards').insert(chunk))
      n += chunk.length
    }
    return n
  },
  async restoreProject(rows) {
    // Keep the original public link when it's free, otherwise get a new one
    const { error: e1 } = await supabase!.from('pipes').insert(rows.pipe)
    if (e1) {
      const { form_slug: _s, ...rest } = rows.pipe
      void _s
      check(await supabase!.from('pipes').insert(rest))
    }
    try {
      if (rows.phases.length) check(await supabase!.from('phases').insert(rows.phases))
      if (rows.fields.length) check(await supabase!.from('fields').insert(rows.fields))
      if (rows.transitions.length) check(await supabase!.from('phase_transitions').insert(rows.transitions))
      if (rows.templates.length) check(await supabase!.from('pdf_templates').insert(rows.templates))
      // holders before members (members point to their holder)
      const ordered = [...rows.cards].sort((a, b) => Number(!!a.family_of) - Number(!!b.family_of))
      for (let i = 0; i < ordered.length; i += 200) check(await supabase!.from('cards').insert(ordered.slice(i, i + 200)))
      // history: send whole cards per call so each card's events stay together
      const byCard = new Map<string, typeof rows.events>()
      for (const e of rows.events) (byCard.get(e.card_id) ?? byCard.set(e.card_id, []).get(e.card_id)!).push(e)
      let batch: typeof rows.events = []
      for (const list of byCard.values()) {
        batch.push(...list)
        if (batch.length >= 500) { check(await supabase!.rpc('restore_card_events', { p_events: batch })); batch = [] }
      }
      if (batch.length) check(await supabase!.rpc('restore_card_events', { p_events: batch }))
    } catch (e) {
      // undo a half-restored project
      await supabase!.from('cards').delete().eq('pipe_id', rows.pipe.id)
      await supabase!.from('pipes').delete().eq('id', rows.pipe.id)
      throw e
    }
    return rows.pipe.id
  },
  async listTemplates(pipeId) {
    return check(await supabase!.from('pdf_templates').select('*').eq('pipe_id', pipeId).order('created_at')) as PdfTemplate[]
  },
  async createTemplate(pipeId, input) {
    return check(await supabase!.from('pdf_templates').insert({ ...input, pipe_id: pipeId }).select().single()) as PdfTemplate
  },
  async updateTemplate(id, patch) {
    check(await supabase!.from('pdf_templates').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id))
  },
  async deleteTemplate(id) {
    check(await supabase!.from('pdf_templates').delete().eq('id', id))
  },

  async updateFormSettings(pipeId, settings) {
    check(await supabase!.from('pipes').update({ form_settings: settings }).eq('id', pipeId))
  },
  async createField(pipeId, input, position) {
    return check(await supabase!.from('fields').insert({ ...input, pipe_id: pipeId, position }).select().single()) as Field
  },
  async updateField(id, patch) {
    check(await supabase!.from('fields').update(patch).eq('id', id))
  },
  async deleteField(id) {
    check(await supabase!.from('fields').delete().eq('id', id))
  },
  async reorderFields(orderedIds) {
    await Promise.all(
      orderedIds.map((id, i) => supabase!.from('fields').update({ position: i }).eq('id', id).then(check)),
    )
  },

  async getPublicForm(slug) {
    const data = check(await supabase!.rpc('get_public_form', { p_slug: slug })) as PublicFormDef | null
    return data
  },
  async uploadPublicFile(_slug, file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `incoming/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase!.storage.from('attachments').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return { path, name: file.name, size: file.size, mime: file.type }
  },
  async submitPublicForm(slug, values, honeypot, captchaToken, family) {
    const members = family?.members ?? []
    const holderNeeds = family?.holderNeeds ?? true
    if (captchaToken) {
      const { error } = await supabase!.functions.invoke('submit-form', { body: { slug, values, hp: honeypot, token: captchaToken, family: members, holderNeeds } })
      if (error) throw error
      return
    }
    check(await supabase!.rpc('submit_public_form', { p_slug: slug, p_values: values, p_hp: honeypot, p_family: members, p_holder_needs: holderNeeds }))
  },
  async addFamilyMember(holder, relation, title, values) {
    return check(
      await supabase!
        .from('cards')
        .insert({ pipe_id: holder.pipe_id, phase_id: holder.phase_id, title, values, relation, family_of: holder.id, position: holder.position + 1 })
        .select()
        .single(),
    ) as Card
  },
  onNewCard(cb) {
    const channel = supabase!
      .channel('new-cards')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cards' }, (p) => {
        const card = p.new as Card
        if (card.created_via === 'public_form' && !card.family_of) cb(card)
      })
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  },

  subscribe(pipeId, onChange) {
    const channel = supabase!
      .channel(`pipe-${pipeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `pipe_id=eq.${pipeId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phases', filter: `pipe_id=eq.${pipeId}` }, onChange)
      .subscribe()
    return () => {
      supabase!.removeChannel(channel)
    }
  },
}

export const repo: Repo = isSupabaseConfigured ? supabaseRepo : demoRepo
export const isDemo = !isSupabaseConfigured
