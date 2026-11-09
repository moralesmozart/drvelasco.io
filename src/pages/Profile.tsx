import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, Clock, LogIn, Type, Users } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AVATAR_COLORS, AVATAR_ICONS, type AvatarChoice } from '../components/Avatar'
import { Header } from '../components/Layout'
import { Button, Input, Label, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { repo } from '../lib/repo'

const ACTIVE_MS = 5 * 60_000

function ago(iso: string, lang: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  for (const [unit, secs] of [['day', 86400], ['hour', 3600], ['minute', 60]] as const) {
    if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit)
  }
  return rtf.format(0, 'minute')
}
const fullDate = (iso: string, lang: string) => new Date(iso).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' })

export default function Profile() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { user, updateName, updateAvatar } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const team = useQuery({ queryKey: ['team'], queryFn: () => repo.listTeam(), refetchInterval: 60_000 })
  if (!user) return null
  const avatar: AvatarChoice = user.avatar ?? {}

  async function pick(next: AvatarChoice) {
    try { await updateAvatar(next) } catch { toast.error(t('common.error')) }
  }
  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await updateName(name); toast.success(t('common.saved')) } catch { toast.error(t('common.error')) } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ChevronLeft className="h-4 w-4" /> {t('common.back')}
        </Link>

        {/* my profile */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-5">
            <motion.div key={`${avatar.icon}-${avatar.color}`} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <Avatar name={user.name} avatar={avatar} size="lg" />
            </motion.div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{user.name}</h1>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <form onSubmit={saveName} className="mt-8 flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="profile-name" hint={t('profile.nameHint')}>{t('profile.name')}</Label>
              <Input id="profile-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" loading={saving} disabled={!name.trim() || name.trim() === user.name}>{t('common.save')}</Button>
          </form>

          <div className="mt-8">
            <p className="text-sm font-medium text-slate-700">{t('profile.icon')}</p>
            <p className="text-xs text-slate-500">{t('profile.iconHint')}</p>
            <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-10">
              <IconTile active={!avatar.icon} label={t('profile.initials')} onClick={() => pick({ ...avatar, icon: undefined })}>
                <Type className="h-5 w-5" />
              </IconTile>
              {Object.entries(AVATAR_ICONS).map(([key, Icon]) => (
                <IconTile key={key} active={avatar.icon === key} label={key} onClick={() => pick({ ...avatar, icon: key })}>
                  <Icon className="h-5 w-5" />
                </IconTile>
              ))}
            </div>
            <p className="mt-5 text-sm font-medium text-slate-700">{t('profile.color')}</p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {Object.entries(AVATAR_COLORS).map(([key, [bg, fg]]) => {
                const active = (avatar.color ?? 'care') === key
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={key}
                    aria-pressed={active}
                    onClick={() => pick({ ...avatar, color: key })}
                    className={clsx('grid h-9 w-9 place-items-center rounded-full ring-offset-2 transition', active ? 'ring-2' : 'hover:scale-110')}
                    style={{ background: bg, color: fg, ['--tw-ring-color' as string]: fg }}
                  >
                    {active && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.section>

        {/* team */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Users className="h-5 w-5 text-brand-600" /> {t('profile.team')}</h2>
          <p className="text-sm text-slate-500">{t('profile.teamHint')}</p>

          {team.isLoading ? (
            <div className="grid place-items-center py-10"><Spinner /></div>
          ) : team.isError ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t('profile.teamError')}</p>
          ) : (
            <ul className="mt-5 divide-y divide-slate-100">
              {(team.data ?? []).map((m) => {
                const me = m.user_id === user.id
                const seen = m.last_seen_at && (!m.last_sign_in_at || m.last_seen_at > m.last_sign_in_at) ? m.last_seen_at : m.last_sign_in_at
                const active = !!m.last_seen_at && Date.now() - new Date(m.last_seen_at).getTime() < ACTIVE_MS
                const display = me ? user.name : m.name || m.email.split('@')[0]
                return (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                    <span className="relative">
                      <Avatar name={display} avatar={me ? avatar : m.avatar} size="md" />
                      {active && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" title={t('profile.activeNow')} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-semibold text-slate-900">
                        {display}
                        {me && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">{t('profile.you')}</span>}
                      </p>
                      <p className="truncate text-sm text-slate-500">{m.email}</p>
                    </div>
                    <dl className="grid w-full gap-1 text-xs text-slate-500 sm:w-auto sm:text-right">
                      <div className="flex items-center gap-1.5 sm:justify-end">
                        <Clock className="h-3.5 w-3.5" />
                        <dt className="sr-only">{t('profile.lastActive')}</dt>
                        <dd className={active ? 'font-semibold text-emerald-700' : ''}>
                          {active ? t('profile.activeNow') : seen ? `${t('profile.lastActive')} ${ago(seen, lang)}` : t('profile.never')}
                        </dd>
                      </div>
                      <div className="flex items-center gap-1.5 sm:justify-end">
                        <LogIn className="h-3.5 w-3.5" />
                        <dt>{t('profile.lastLogin')}:</dt>
                        <dd>{m.last_sign_in_at ? fullDate(m.last_sign_in_at, lang) : t('profile.never')}</dd>
                      </div>
                    </dl>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">{t('profile.addHint')}</p>
        </motion.section>
      </main>
    </div>
  )
}

function IconTile({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={clsx('grid aspect-square place-items-center rounded-xl border-2 transition', active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:text-slate-800')}
    >
      {children}
    </button>
  )
}
