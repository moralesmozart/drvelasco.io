import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

let loader: Promise<void> | null = null
function loadScript() {
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { loader = null; reject(new Error('turnstile')) }
    document.head.appendChild(s)
  })
  return loader
}

/** Cloudflare Turnstile captcha (usually invisible / one click). */
export function Turnstile({ siteKey, lang, onToken, resetKey }: { siteKey: string; lang: string; onToken: (t: string | null) => void; resetKey: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      widget.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        language: lang.startsWith('es') ? 'es' : 'pt-br',
        theme: 'light',
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })
    }).catch(() => onToken(null))
    return () => { cancelled = true; if (widget.current) window.turnstile?.remove(widget.current) }
  }, [siteKey, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (resetKey && widget.current) { window.turnstile?.reset(widget.current); onToken(null) }
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={ref} className="min-h-[65px]" />
}
