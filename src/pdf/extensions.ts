import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import { FieldChip } from './fieldChip'

/** Extensions shared by the template editor and the read-only preview. */
export function templateExtensions(editable = true) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    TextStyle, Color, FontSize,
    Highlight.configure({ multicolor: true }),
    Image.configure({
      inline: true, allowBase64: true,
      resize: editable ? { enabled: true, directions: ['bottom-right', 'bottom-left'], minWidth: 40, alwaysPreserveAspectRatio: true } : false,
    }),
    FieldChip,
  ]
}
