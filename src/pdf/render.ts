import type { Content, ContentText, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { PdfTemplate } from '../lib/types'
import { resolveKey, type RenderContext } from './variables'

interface PMNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  content?: PMNode[]
}

const MM = 2.8346
const A4_WIDTH = 595.28
const HEADING_SIZE: Record<number, number> = { 1: 22, 2: 17, 3: 14 }

function runStyle(marks: PMNode['marks']): Partial<ContentText> {
  const st: Partial<ContentText> & { decoration?: string } = {}
  for (const m of marks ?? []) {
    if (m.type === 'bold') st.bold = true
    if (m.type === 'italic') st.italics = true
    if (m.type === 'underline') st.decoration = 'underline'
    if (m.type === 'strike') st.decoration = 'lineThrough'
    if (m.type === 'highlight') st.background = String(m.attrs?.color || '#fef08a')
    if (m.type === 'textStyle') {
      if (m.attrs?.color) st.color = String(m.attrs.color)
      const fs = parseFloat(String(m.attrs?.fontSize ?? ''))
      if (fs) st.fontSize = fs
    }
  }
  return st as Partial<ContentText>
}

function inlineRuns(nodes: PMNode[] | undefined, ctx: RenderContext): ContentText[] {
  const runs: ContentText[] = []
  for (const n of nodes ?? []) {
    if (n.type === 'text') runs.push({ text: n.text ?? '', ...runStyle(n.marks) })
    else if (n.type === 'hardBreak') runs.push({ text: '\n' })
    else if (n.type === 'fieldChip') runs.push({ text: resolveKey(String(n.attrs?.key ?? ''), ctx), ...runStyle(n.marks) })
  }
  return runs
}

function imageBlock(n: PMNode, alignment: string): Content {
  const px = Number(n.attrs?.width) || 200 // editor pixels (96 dpi) → PDF points (72 dpi)
  return { image: String(n.attrs?.src), width: Math.min(px * 0.75, 480), alignment: alignment as 'left', margin: [0, 2, 0, 6] }
}

function block(n: PMNode, ctx: RenderContext, contentWidth: number): Content[] {
  const align = (n.attrs?.textAlign as string) || 'left'
  switch (n.type) {
    case 'paragraph': {
      const kids = n.content ?? []
      const images = kids.filter((k) => k.type === 'image')
      const rest = kids.filter((k) => k.type !== 'image')
      const out: Content[] = images.map((img) => imageBlock(img, align))
      const runs = inlineRuns(rest, ctx)
      if (runs.length || !images.length) {
        out.push({ text: runs.length ? runs : ' ', alignment: align as 'left', margin: [0, 0, 0, 6] })
      }
      return out
    }
    case 'heading': {
      const level = Number(n.attrs?.level) || 1
      return [{ text: inlineRuns(n.content, ctx), fontSize: HEADING_SIZE[level] ?? 14, bold: true, alignment: align as 'left', margin: [0, level === 1 ? 4 : 8, 0, 8] }]
    }
    case 'bulletList':
    case 'orderedList': {
      const items = (n.content ?? []).map((li) => ({ stack: (li.content ?? []).flatMap((c) => block(c, ctx, contentWidth)) }))
      return [n.type === 'bulletList' ? { ul: items, margin: [0, 0, 0, 6] } : { ol: items, margin: [0, 0, 0, 6] }]
    }
    case 'blockquote':
      return [{ stack: (n.content ?? []).flatMap((c) => block(c, ctx, contentWidth)), margin: [14, 0, 0, 6], color: '#475569' }]
    case 'horizontalRule':
      return [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 0.8, lineColor: '#cbd5e1' }], margin: [0, 6, 0, 12] }]
    case 'image':
      return [imageBlock(n, align)]
    default:
      return n.content ? n.content.flatMap((c) => block(c, ctx, contentWidth)) : []
  }
}

export function toDocDefinition(tpl: Pick<PdfTemplate, 'content' | 'page' | 'name'>, ctx: RenderContext): TDocumentDefinitions {
  const margin = (tpl.page?.margin ?? 20) * MM
  const contentWidth = A4_WIDTH - margin * 2
  const doc = tpl.content as unknown as PMNode
  return {
    pageSize: 'A4',
    pageMargins: [margin, margin, margin, margin],
    info: { title: tpl.name },
    defaultStyle: { fontSize: 11, lineHeight: 1.35, color: '#1e293b' },
    content: (doc?.content ?? []).flatMap((n) => block(n, ctx, contentWidth)),
  }
}

/** Builds the PDF in the browser (pdfmake is loaded on demand). Nothing is uploaded or stored. */
export async function renderPdf(tpl: Pick<PdfTemplate, 'content' | 'page' | 'name'>, ctx: RenderContext): Promise<Blob> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  pdfMake.addVirtualFileSystem(vfs)
  return pdfMake.createPdf(toDocDefinition(tpl, ctx)).getBlob()
}

/** One PDF with the same template filled once per person, each on its own page(s). */
export async function renderPdfMany(tpl: Pick<PdfTemplate, 'content' | 'page' | 'name'>, ctxs: RenderContext[]): Promise<Blob> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  pdfMake.addVirtualFileSystem(vfs)
  const defs = ctxs.map((c) => toDocDefinition(tpl, c))
  const content = defs.flatMap((d, i) => [
    ...(i > 0 ? [{ text: '', pageBreak: 'before' as const }] : []),
    ...((d.content as unknown[]) ?? []),
  ])
  return pdfMake.createPdf({ ...defs[0], content: content as TDocumentDefinitions['content'] }).getBlob()
}
