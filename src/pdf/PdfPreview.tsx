import { EditorContent, useEditor } from '@tiptap/react'
import { AlertTriangle, Download, Loader2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, Modal } from '../components/ui'
import { fieldText } from '../lib/localize'
import type { Card, Field, PdfTemplate } from '../lib/types'
import { templateExtensions } from './extensions'
import { renderPdf, renderPdfMany } from './render'
import { collectKeys, resolveKey, type RenderContext } from './variables'

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

interface PMNode { type: string; text?: string; attrs?: Record<string, unknown>; marks?: unknown[]; content?: PMNode[] }

/** Replace chips with the card's values. Empty ones show their label highlighted (preview only, blank in the PDF). */
function resolveDoc(node: PMNode, ctx: RenderContext): PMNode {
  if (node.type === 'fieldChip') {
    const value = resolveKey(String(node.attrs?.key ?? ''), ctx)
    if (value) return { type: 'text', text: value, ...(node.marks ? { marks: node.marks } : {}) }
    return { type: 'text', text: `[${node.attrs?.label ?? ''}]`, marks: [...((node.marks as unknown[]) ?? []), { type: 'highlight', attrs: { color: '#fde68a' } }] }
  }
  return node.content ? { ...node, content: node.content.map((c) => resolveDoc(c, ctx)) } : node
}

/** Shows the filled-in document and downloads it as a PDF generated in the browser. Nothing is stored. */
export function PdfPreview({ template, card, fields, onClose, all }: {
  template: PdfTemplate | null; card: Card | null; fields: Field[]; onClose: () => void
  /** Family: every person (holder first) → one PDF, one section per person; the preview shows the first */
  all?: Card[] | null
}) {
  const open = !!template && !!card
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-4xl"
      title={<span className="flex flex-wrap items-baseline gap-x-2">{template?.name}<span className="text-sm font-normal text-slate-500">· {all?.length ? t('family.people', { count: all.length }) : card?.title}</span></span>}
    >
      {open ? <PreviewBody template={template!} card={card!} fields={fields} onClose={onClose} all={all ?? null} /> : <p>{t('common.loading')}</p>}
    </Modal>
  )
}

function PreviewBody({ template, card, fields, onClose, all }: { template: PdfTemplate; card: Card; fields: Field[]; onClose: () => void; all: Card[] | null }) {
  const { t, i18n } = useTranslation()
  // Snapshot when opened (callers pass fresh objects on every render)
  const [snap] = useState(() => ({ template, card, all }))
  const ctx = useMemo<RenderContext>(() => ({ card: snap.card, fields, lang: snap.template.page?.lang ?? 'pt-BR' }), [snap, fields])
  const [busy, setBusy] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const missing = useMemo(
    () => [...collectKeys(snap.template.content)]
      .filter((k) => !k.startsWith('sys:') && !resolveKey(k, ctx))
      .map((k) => fields.find((f) => f.id === k))
      .filter((f): f is Field => !!f),
    [snap, ctx, fields],
  )

  const editor = useEditor({
    editable: false,
    extensions: templateExtensions(false),
    content: resolveDoc(snap.template.content as unknown as PMNode, ctx) as unknown as Record<string, unknown>,
    editorProps: { attributes: { class: 'tpl-editor' } },
  })

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = () => setScale(Math.min(1, (el.clientWidth - 32) / 794))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Warm up the PDF engine while the person reads the preview
  useEffect(() => { void import('pdfmake/build/pdfmake') }, [])

  async function download() {
    setBusy(true)
    try {
      const lang = snap.template.page?.lang ?? 'pt-BR'
      const blob = snap.all?.length
        ? await renderPdfMany(snap.template, snap.all.map((c) => ({ card: c, fields, lang })))
        : await renderPdf(snap.template, ctx)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug(snap.template.name)}-${slug(snap.card.title) || 'card'}${snap.all?.length ? `-familia-${snap.all.length}` : ''}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      toast.error(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const margin = (snap.template.page?.margin ?? 20) * 3.78
  return (
    <>
      {missing.length > 0 && (
        <div className="mb-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('pdf.missing')}: {missing.map((f) => fieldText(f, i18n.language).label).join(', ')}</span>
        </div>
      )}
      <div ref={wrap} className="scroll-thin h-[62vh] overflow-y-auto overflow-x-hidden rounded-xl bg-slate-100 py-4">
        <div style={{ width: 794 * scale, height: 1123 * scale }} className="mx-auto">
          <div className="tpl-page origin-top-left bg-white shadow-lift" style={{ transform: `scale(${scale})`, padding: margin }}>
            {editor ? <EditorContent editor={editor} /> : <Loader2 className="h-5 w-5 animate-spin text-slate-300" />}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="mr-auto text-xs text-slate-400">{t('pdf.notStored')}</p>
        <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        <Button loading={busy} onClick={download}><Download className="h-4 w-4" /> {t('pdf.download')}</Button>
      </div>
    </>
  )
}
