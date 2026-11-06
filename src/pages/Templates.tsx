import { useQuery, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { Placeholder } from '@tiptap/extensions'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Braces, ChevronLeft, Copy, Eye, FilePlus2, FileText, Highlighter,
  ImagePlus, Italic, List, ListOrdered, Minus, MoreHorizontal, Pencil, Redo2, Strikethrough, Trash2, Underline as UnderlineIcon, Undo2,
} from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Header, PipeIcon } from '../components/Layout'
import { Button, ConfirmDialog, IconButton, Input, Label, Menu, Modal, Spinner } from '../components/ui'
import { phaseLabel } from '../lib/localize'
import { repo } from '../lib/repo'
import type { Board, PdfTemplate } from '../lib/types'
import { PdfPreview } from '../pdf/PdfPreview'
import { templateExtensions } from '../pdf/extensions'
import { SYSTEM_VARS } from '../pdf/variables'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'heading', attrs: { level: 1, textAlign: 'center' } }, { type: 'paragraph' }] }
const FONT_SIZES = ['9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '32pt']
const COLORS = ['#1e293b', '#475569', '#2c6a5a', '#1d4ed8', '#7c3aed', '#be123c', '#b45309']
const HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecdd3']

export default function Templates() {
  const { pipeId = '' } = useParams()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const board = useQuery({ queryKey: ['board', pipeId], queryFn: () => repo.getBoard(pipeId) })
  const list = useQuery({ queryKey: ['templates', pipeId], queryFn: () => repo.listTemplates(pipeId) })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<PdfTemplate | null>(null)
  const [deleting, setDeleting] = useState<PdfTemplate | null>(null)

  const templates = list.data ?? []
  const selected = templates.find((x) => x.id === selectedId) ?? templates[0] ?? null
  const refresh = () => qc.invalidateQueries({ queryKey: ['templates', pipeId] })

  async function create(from?: PdfTemplate) {
    const tpl = await repo.createTemplate(pipeId, {
      name: from ? `${from.name} (2)` : t('pdf.newName'),
      content: from?.content ?? EMPTY_DOC,
      page: from?.page ?? { lang: 'pt-BR', margin: 20 },
    })
    await refresh()
    setSelectedId(tpl.id)
  }

  if (board.isLoading || list.isLoading || !board.data) return <div className="grid min-h-screen place-items-center"><Spinner /></div>

  return (
    <div className="flex h-screen flex-col">
      <Header
        left={
          <div className="flex min-w-0 items-center gap-2">
            <Link to={`/pipe/${pipeId}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('common.back')}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <PipeIcon name={board.data.pipe.icon} color={board.data.pipe.color} size="sm" />
            <h1 className="truncate text-lg font-semibold">{board.data.pipe.name}</h1>
            <span className="text-slate-300">/</span>
            <span className="truncate text-slate-600">{t('pdf.title')}</span>
          </div>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="scroll-thin overflow-y-auto border-b border-slate-200 bg-white p-3 md:border-b-0 md:border-r">
          <Button className="mb-3 w-full" onClick={() => create()}><FilePlus2 className="h-4 w-4" /> {t('pdf.new')}</Button>
          <ul className="space-y-1">
            {templates.map((tpl) => (
              <li key={tpl.id} className="group flex items-center">
                <button
                  onClick={() => setSelectedId(tpl.id)}
                  className={clsx(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition',
                    selected?.id === tpl.id ? 'bg-brand-50 font-medium text-brand-800' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tpl.name}</span>
                </button>
                <Menu
                  trigger={(open) => <IconButton label="Menu" onClick={open} className="opacity-0 group-hover:opacity-100 focus:opacity-100"><MoreHorizontal className="h-4 w-4" /></IconButton>}
                  items={[
                    { label: t('pdf.rename'), icon: <Pencil className="h-4 w-4" />, onClick: () => setRenaming(tpl) },
                    { label: t('builder.duplicate'), icon: <Copy className="h-4 w-4" />, onClick: () => create(tpl) },
                    { label: t('common.delete'), icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setDeleting(tpl) },
                  ]}
                />
              </li>
            ))}
          </ul>
          {templates.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-400">{t('pdf.empty')}</p>}
        </aside>

        <main className="min-h-0 overflow-hidden bg-slate-100">
          {selected ? (
            <TemplateEditor key={selected.id} template={selected} board={board.data} onSaved={refresh} />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center text-slate-500">
              <div>
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3">{t('pdf.emptyHint')}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <RenameDialog
        template={renaming}
        onClose={() => setRenaming(null)}
        onSave={async (name) => { await repo.updateTemplate(renaming!.id, { name }); refresh() }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('pdf.deleteTitle', { name: deleting?.name })}
        body={t('pdf.deleteBody')}
        confirmLabel={t('common.delete')}
        onConfirm={async () => { await repo.deleteTemplate(deleting!.id); setSelectedId(null); refresh() }}
      />
    </div>
  )
}

function RenameDialog({ template, onClose, onSave }: { template: PdfTemplate | null; onClose: () => void; onSave: (n: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  useEffect(() => { if (template) setName(template.name) }, [template])
  return (
    <Modal
      open={!!template}
      onClose={onClose}
      title={t('pdf.rename')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button form="rename-tpl" type="submit" disabled={!name.trim()}>{t('common.save')}</Button></>}
    >
      <form id="rename-tpl" onSubmit={async (e) => { e.preventDefault(); await onSave(name.trim()); onClose() }}>
        <Label htmlFor="tpl-name">{t('pdf.name')}</Label>
        <Input id="tpl-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </form>
    </Modal>
  )
}

/* ───────────────────────── Editor ───────────────────────── */

function TemplateEditor({ template, board, onSaved }: { template: PdfTemplate; board: Board; onSaved: () => void }) {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(template.page ?? { lang: 'pt-BR', margin: 20 })
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [previewCard, setPreviewCard] = useState<string | null>(null)
  const [pickCard, setPickCard] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const save = (patch: Partial<Pick<PdfTemplate, 'content' | 'page'>>) => {
    setSaving('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try { await repo.updateTemplate(template.id, patch); setSaving('saved'); onSaved() } catch { setSaving('idle'); toast.error(t('common.error')) }
    }, 700)
  }

  const editor = useEditor({
    extensions: [...templateExtensions(true), Placeholder.configure({ placeholder: t('pdf.placeholder') })],
    content: template.content,
    editorProps: { attributes: { class: 'tpl-editor min-h-[900px]' } },
    onUpdate: ({ editor }) => save({ content: editor.getJSON() as Record<string, unknown> }),
  })

  // Save pending changes when switching template / leaving
  useEffect(() => () => {
    if (timer.current && editor) { clearTimeout(timer.current); void repo.updateTemplate(template.id, { content: editor.getJSON() as Record<string, unknown>, page }) }
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  function setPageSetting(patch: Partial<typeof page>) {
    const next = { ...page, ...patch }
    setPage(next)
    save({ page: next, content: editor?.getJSON() as Record<string, unknown> })
  }

  async function addImage(file: File) {
    const src = await toDataUrl(file)
    editor?.chain().focus().setImage({ src, width: 200 }).run()
  }

  const marginPx = page.margin * 3.78
  const card = board.cards.find((c) => c.id === previewCard) ?? null

  if (!editor) return null
  return (
    <div className="flex h-full flex-col">
      <Toolbar editor={editor} board={board} onImage={() => fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addImage(f); e.target.value = '' }} />

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          {t('pdf.language')}
          <select value={page.lang} onChange={(e) => setPageSetting({ lang: e.target.value as 'pt-BR' | 'es' })} className="h-8 rounded-lg border border-slate-200 bg-white px-2">
            <option value="pt-BR">Português</option>
            <option value="es">Español</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-slate-600">
          {t('pdf.margins')}
          <select value={page.margin} onChange={(e) => setPageSetting({ margin: Number(e.target.value) })} className="h-8 rounded-lg border border-slate-200 bg-white px-2">
            <option value={15}>{t('pdf.marginNarrow')}</option>
            <option value={20}>{t('pdf.marginNormal')}</option>
            <option value={25}>{t('pdf.marginWide')}</option>
          </select>
        </label>
        <span className="text-xs text-slate-400">{saving === 'saving' ? t('builder.saving') : saving === 'saved' ? t('common.saved') : ''}</span>
        <Button size="sm" className="ml-auto" onClick={() => setPickCard(true)} disabled={!board.cards.length}>
          <Eye className="h-4 w-4" /> {t('pdf.preview')}
        </Button>
      </div>

      <div className="scroll-thin flex-1 overflow-auto p-4 sm:p-8">
        <div className="tpl-page mx-auto rounded-sm bg-white shadow-lift" style={{ padding: marginPx }}>
          <EditorContent editor={editor} />
        </div>
        <p className="mx-auto mt-3 max-w-[794px] text-center text-xs text-slate-400">{t('pdf.chipHint')}</p>
      </div>

      <Modal open={pickCard} onClose={() => setPickCard(false)} title={t('pdf.pickCard')} width="max-w-md">
        <ul className="scroll-thin max-h-[50vh] space-y-1 overflow-y-auto">
          {board.cards.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => { setPreviewCard(c.id); setPickCard(false) }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                <span className="truncate font-medium text-slate-800">{c.title}</span>
                <span className="shrink-0 text-xs text-slate-500">{phaseLabel(board.phases.find((p) => p.id === c.phase_id) ?? { name: '' }, i18n.language)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
      <PdfPreview
        template={card ? { ...template, content: editor.getJSON() as Record<string, unknown>, page } : null}
        card={card}
        fields={board.fields}
        onClose={() => setPreviewCard(null)}
      />
    </div>
  )
}

function Toolbar({ editor, board, onImage }: { editor: Editor; board: Board; onImage: () => void }) {
  const { t, i18n } = useTranslation()
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }), h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'),
      left: e.isActive({ textAlign: 'left' }), center: e.isActive({ textAlign: 'center' }), right: e.isActive({ textAlign: 'right' }), justify: e.isActive({ textAlign: 'justify' }),
      fontSize: (e.getAttributes('textStyle').fontSize as string) || '',
      canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  })

  const groups = useMemo(() => {
    const start = board.fields.filter((f) => f.phase_id === null && f.type !== 'info' && f.type !== 'attachment')
    const phases = board.phases
      .map((p) => ({ title: phaseLabel(p, i18n.language), items: board.fields.filter((f) => f.phase_id === p.id && f.type !== 'info' && f.type !== 'attachment') }))
      .filter((g) => g.items.length)
    return [
      { title: t('builder.startForm'), items: start.map((f) => ({ key: f.id, label: f.label })) },
      ...phases.map((g) => ({ title: g.title, items: g.items.map((f) => ({ key: f.id, label: f.label })) })),
      { title: t('pdf.system'), items: SYSTEM_VARS.map((k) => ({ key: k, label: t(`pdf.var.${k.slice(4)}`) })) },
    ]
  }, [board, t, i18n.language])

  const c = () => editor.chain().focus()
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-2 py-1.5">
      <Tb label={t('pdf.undo')} onClick={() => c().undo().run()} disabled={!s.canUndo}><Undo2 className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.redo')} onClick={() => c().redo().run()} disabled={!s.canRedo}><Redo2 className="h-4 w-4" /></Tb>
      <Sep />
      <select
        aria-label={t('pdf.style')}
        value={s.h1 ? 'h1' : s.h2 ? 'h2' : s.h3 ? 'h3' : 'p'}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'p') c().setParagraph().run()
          else c().setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run()
        }}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
      >
        <option value="p">{t('pdf.paragraph')}</option>
        <option value="h1">{t('pdf.title1')}</option>
        <option value="h2">{t('pdf.title2')}</option>
        <option value="h3">{t('pdf.title3')}</option>
      </select>
      <select
        aria-label={t('pdf.fontSize')}
        value={s.fontSize}
        onChange={(e) => (e.target.value ? c().setFontSize(e.target.value).run() : c().unsetFontSize().run())}
        className="ml-1 h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm"
      >
        <option value="">11pt</option>
        {FONT_SIZES.filter((f) => f !== '11pt').map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <Sep />
      <Tb label={t('pdf.bold')} active={s.bold} onClick={() => c().toggleBold().run()}><Bold className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.italic')} active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.underline')} active={s.underline} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.strike')} active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Tb>
      <Menu
        align="left"
        trigger={(open) => <Tb label={t('pdf.color')} onClick={open}><span className="h-4 w-4 rounded-full border border-slate-300" style={{ background: (editor.getAttributes('textStyle').color as string) || '#1e293b' }} /></Tb>}
        items={COLORS.map((col) => ({ label: col, icon: <span className="h-4 w-4 rounded-full" style={{ background: col }} />, onClick: () => c().setColor(col).run() }))}
      />
      <Menu
        align="left"
        trigger={(open) => <Tb label={t('pdf.highlight')} onClick={open}><Highlighter className="h-4 w-4" /></Tb>}
        items={[
          ...HIGHLIGHTS.map((col) => ({ label: col, icon: <span className="h-4 w-4 rounded" style={{ background: col }} />, onClick: () => c().setHighlight({ color: col }).run() })),
          { label: t('pdf.noHighlight'), onClick: () => c().unsetHighlight().run() },
        ]}
      />
      <Sep />
      <Tb label={t('pdf.alignLeft')} active={s.left} onClick={() => c().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.alignCenter')} active={s.center} onClick={() => c().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.alignRight')} active={s.right} onClick={() => c().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.justify')} active={s.justify} onClick={() => c().setTextAlign('justify').run()}><AlignJustify className="h-4 w-4" /></Tb>
      <Sep />
      <Tb label={t('pdf.bullets')} active={s.bullet} onClick={() => c().toggleBulletList().run()}><List className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.numbers')} active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.line')} onClick={() => c().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Tb>
      <Tb label={t('pdf.image')} onClick={onImage}><ImagePlus className="h-4 w-4" /></Tb>
      <Sep />
      <FieldPicker groups={groups} onPick={(key, label) => c().insertFieldChip({ key, label }).run()} />
    </div>
  )
}

function FieldPicker({ groups, onPick }: { groups: Array<{ title: string; items: Array<{ key: string; label: string }> }>; onPick: (k: string, l: string) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)} className="border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100">
        <Braces className="h-4 w-4" /> {t('pdf.insertField')}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lift sm:left-0 sm:right-auto">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="mb-2 h-9" />
          <div className="scroll-thin max-h-80 overflow-y-auto">
            {groups.map((g) => {
              const items = g.items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
              if (!items.length) return null
              return (
                <div key={g.title} className="mb-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.title}</p>
                  {items.map((i) => (
                    <button
                      key={i.key}
                      onClick={() => { onPick(i.key, i.label); setOpen(false); setQ('') }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-brand-50"
                    >
                      <span className={clsx('h-2 w-2 shrink-0 rounded-full', i.key.startsWith('sys:') ? 'bg-indigo-400' : 'bg-brand-400')} />
                      <span className="line-clamp-2">{i.label}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Tb({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={clsx('grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-30', active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
    >
      {children}
    </button>
  )
}

const Sep = () => <span className="mx-1 h-5 w-px bg-slate-200" />

/** Shrinks an image (logo, signature, stamp) and embeds it in the template. PNG keeps transparency. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return file.type === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88)
}
