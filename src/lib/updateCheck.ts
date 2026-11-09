import { toast } from 'sonner'
import i18n from './i18n'

declare const __BUILD_ID__: string

/** Polls version.json; when a newer deploy is live, offers a one-click reload. */
export function startUpdateCheck() {
  if (!import.meta.env.PROD) return
  let shown = false
  const check = async () => {
    if (shown || document.visibilityState !== 'visible') return
    try {
      const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!r.ok) return
      const { v } = (await r.json()) as { v?: string }
      if (v && v !== __BUILD_ID__) {
        shown = true
        toast(i18n.t('app.updateTitle'), {
          description: i18n.t('app.updateHint'),
          duration: Infinity,
          action: { label: i18n.t('app.updateNow'), onClick: () => window.location.reload() },
        })
      }
    } catch { /* offline: try later */ }
  }
  setInterval(check, 5 * 60_000)
  document.addEventListener('visibilitychange', check)
  setTimeout(check, 30_000)
}
