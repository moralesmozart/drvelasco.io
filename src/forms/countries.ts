export interface Country { iso: string; dial: string; pt: string; es: string }

/** First three are pinned on top; the rest are alphabetical (PT name). */
export const COUNTRIES: Country[] = [
  { iso: 'BR', dial: '55', pt: 'Brasil', es: 'Brasil' },
  { iso: 'ES', dial: '34', pt: 'Espanha', es: 'España' },
  { iso: 'US', dial: '1', pt: 'Estados Unidos', es: 'Estados Unidos' },
  { iso: 'DE', dial: '49', pt: 'Alemanha', es: 'Alemania' },
  { iso: 'AO', dial: '244', pt: 'Angola', es: 'Angola' },
  { iso: 'AR', dial: '54', pt: 'Argentina', es: 'Argentina' },
  { iso: 'BE', dial: '32', pt: 'Bélgica', es: 'Bélgica' },
  { iso: 'BO', dial: '591', pt: 'Bolívia', es: 'Bolivia' },
  { iso: 'CV', dial: '238', pt: 'Cabo Verde', es: 'Cabo Verde' },
  { iso: 'CA', dial: '1', pt: 'Canadá', es: 'Canadá' },
  { iso: 'CL', dial: '56', pt: 'Chile', es: 'Chile' },
  { iso: 'CO', dial: '57', pt: 'Colômbia', es: 'Colombia' },
  { iso: 'EC', dial: '593', pt: 'Equador', es: 'Ecuador' },
  { iso: 'FR', dial: '33', pt: 'França', es: 'Francia' },
  { iso: 'NL', dial: '31', pt: 'Holanda', es: 'Países Bajos' },
  { iso: 'IE', dial: '353', pt: 'Irlanda', es: 'Irlanda' },
  { iso: 'IT', dial: '39', pt: 'Itália', es: 'Italia' },
  { iso: 'MX', dial: '52', pt: 'México', es: 'México' },
  { iso: 'MZ', dial: '258', pt: 'Moçambique', es: 'Mozambique' },
  { iso: 'PY', dial: '595', pt: 'Paraguai', es: 'Paraguay' },
  { iso: 'PE', dial: '51', pt: 'Peru', es: 'Perú' },
  { iso: 'PT', dial: '351', pt: 'Portugal', es: 'Portugal' },
  { iso: 'GB', dial: '44', pt: 'Reino Unido', es: 'Reino Unido' },
  { iso: 'CH', dial: '41', pt: 'Suíça', es: 'Suiza' },
  { iso: 'UY', dial: '598', pt: 'Uruguai', es: 'Uruguay' },
  { iso: 'VE', dial: '58', pt: 'Venezuela', es: 'Venezuela' },
]

export const flag = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)))

/** "+55 31999998888" → { iso, dial, number }. Numbers without "+" are treated as Brazilian. */
export function parsePhone(value: string | null | undefined, preferIso?: string) {
  const v = (value ?? '').trim()
  if (!v) return { iso: preferIso ?? 'BR', dial: '55', number: '' }
  if (v.startsWith('+')) {
    const [code, ...rest] = v.slice(1).split(' ')
    const digits = code.replace(/\D/g, '')
    if (rest.length) {
      const c = COUNTRIES.find((x) => x.dial === digits && (!preferIso || x.iso === preferIso)) ?? COUNTRIES.find((x) => x.dial === digits)
      return { iso: c?.iso ?? 'BR', dial: digits, number: rest.join('').replace(/\D/g, '') }
    }
    // no space: match the longest dial code
    const all = v.replace(/\D/g, '')
    const c = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((x) => all.startsWith(x.dial))
    return { iso: c?.iso ?? 'BR', dial: c?.dial ?? '', number: c ? all.slice(c.dial.length) : all }
  }
  return { iso: 'BR', dial: '55', number: v.replace(/\D/g, '') }
}

/** wa.me link (WhatsApp wants digits only, country code included, no "+"). */
export function whatsappLink(value: string | null | undefined) {
  const p = parsePhone(value)
  if (!p.number) return null
  return `https://wa.me/${p.dial}${p.number}`
}
