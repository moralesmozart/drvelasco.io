import type { Field, FormSettings, Phase } from './types'

export const isEs = (lang: string) => lang.toLowerCase().startsWith('es')

/** Display text for a field in the current language. Stored values always stay in the original option text. */
export function fieldText(f: Field, lang: string) {
  const tr = isEs(lang) ? f.translations?.es : undefined
  return {
    label: tr?.label?.trim() || f.label,
    description: tr?.description?.trim() || f.description,
    option: (o: string) => {
      const i = f.options.indexOf(o)
      return (i >= 0 && tr?.options?.[i]?.trim()) || o
    },
  }
}

export function phaseLabel(p: Pick<Phase, 'name' | 'translations'>, lang: string) {
  return (isEs(lang) && p.translations?.es?.name?.trim()) || p.name
}

export function formText(s: FormSettings, lang: string) {
  const es = isEs(lang) ? s.es : undefined
  return {
    title: es?.title?.trim() || s.title,
    description: es?.description?.trim() || s.description,
    success_message: es?.success_message?.trim() || s.success_message,
    submit_label: es?.submit_label?.trim() || s.submit_label,
  }
}
