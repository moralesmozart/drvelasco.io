import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../lib/auth'
import { repo } from '../lib/repo'

/** Soft two-note chime (no audio file needed). */
function chime() {
  try {
    const ctx = new AudioContext()
    ;[660, 880].forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.16
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(0.15, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5)
      o.connect(g).connect(ctx.destination)
      o.start(t0)
      o.stop(t0 + 0.55)
    })
    setTimeout(() => ctx.close(), 1200)
  } catch { /* audio not allowed yet */ }
}

/** Live alerts for new public-form submissions while the team is logged in. */
export function NewCardAlerts() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const unread = useRef(0)
  const baseTitle = useRef(document.title)

  useEffect(() => {
    if (!user) return
    const resetTitle = () => { unread.current = 0; document.title = baseTitle.current }
    window.addEventListener('focus', resetTitle)
    const off = repo.onNewCard((card) => {
      qc.invalidateQueries({ queryKey: ['board', card.pipe_id] })
      qc.invalidateQueries({ queryKey: ['pipes'] })
      const open = () => navigate(`/pipe/${card.pipe_id}?card=${card.id}`)
      toast(t('alerts.newCard', { name: card.title }), { action: { label: t('alerts.open'), onClick: open }, duration: 10000 })
      chime()
      if (document.hidden) {
        unread.current += 1
        document.title = `(${unread.current}) ${baseTitle.current}`
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(t('alerts.newCard', { name: card.title }), { icon: './favicon.svg', tag: card.id })
          n.onclick = () => { window.focus(); open(); n.close() }
        }
      }
    })
    return () => { off(); window.removeEventListener('focus', resetTitle) }
  }, [user, qc, navigate, t])

  return null
}
