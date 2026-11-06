import { mergeAttributes, Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fieldChip: { insertFieldChip: (attrs: { key: string; label: string }) => ReturnType }
  }
}

/** Inline placeholder that becomes the card's value when the PDF is generated. */
export const FieldChip = Node.create({
  name: 'fieldChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      key: { default: '' },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-field-chip]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const sys = String(node.attrs.key).startsWith('sys:')
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-field-chip': node.attrs.key,
        class: sys ? 'field-chip field-chip--sys' : 'field-chip',
        contenteditable: 'false',
      }),
      node.attrs.label || node.attrs.key,
    ]
  },

  renderText({ node }) {
    return `{${node.attrs.label}}`
  },

  addCommands() {
    return {
      insertFieldChip:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent([{ type: this.name, attrs }, { type: 'text', text: ' ' }]).run(),
    }
  },
})
