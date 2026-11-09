import { Bell, BellRing, Briefcase, ClipboardList, UserRound, FileCheck, HeartPulse, Inbox, LogOut, Plane, RotateCcw, Stethoscope, Users, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from './Avatar'
import { useAuth } from '../lib/auth'
import { LANGS } from '../lib/i18n'
import { isDemo } from '../lib/repo'
import { resetDemo } from '../lib/demoRepo'
import { IconButton, Menu } from './ui'
import { useState } from 'react'

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope, clipboard: ClipboardList, 'heart-pulse': HeartPulse, 'file-check': FileCheck,
  briefcase: Briefcase, inbox: Inbox, users: Users, plane: Plane,
}

export function PipeIcon({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = ICONS[name] ?? ClipboardList
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-11 w-11 rounded-xl', lg: 'h-12 w-12 rounded-xl' }[size]
  return (
    <span className={clsx('grid shrink-0 place-items-center text-white', box)} style={{ backgroundColor: color }}>
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  )
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className={clsx('flex items-center gap-2.5 text-lg font-bold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
      <span className={clsx('grid h-9 w-9 place-items-center rounded-xl', light ? 'bg-white text-care-700' : 'bg-care-700 text-white')}>
        <Stethoscope className="h-5 w-5" />
      </span>
      drvelasco
    </Link>
  )
}

export function LangSwitch() {
  const { i18n } = useTranslation()
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          className={clsx(
            'rounded-md px-2 py-1 transition',
            i18n.language === l.code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

export function Header({ left }: { left?: ReactNode }) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      {isDemo && (
        <div className="flex items-center justify-center gap-3 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
          {t('app.demo')}
          <button onClick={() => { resetDemo(); location.reload() }} className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline">
            <RotateCcw className="h-3 w-3" /> {t('app.resetDemo')}
          </button>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        {left ?? <Logo />}
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch />
          {user && <NotifyBell />}
          {user && (
            <>
              <Menu
                trigger={(open) => (
                  <button onClick={open} title={user.email} aria-label={t('profile.menu')} className="rounded-full ring-brand-300 transition hover:ring-2">
                    <Avatar name={user.name} avatar={user.avatar} />
                  </button>
                )}
                items={[
                  { label: t('profile.title'), icon: <UserRound className="h-4 w-4" />, onClick: () => navigate('/profile') },
                  { label: t('auth.logout'), icon: <LogOut className="h-4 w-4" />, onClick: () => { void signOut() } },
                ]}
              />
            </>
          )}
        </div>
      </header>
    </>
  )
}

function NotifyBell() {
  const { t } = useTranslation()
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [perm, setPerm] = useState(supported ? Notification.permission : 'denied')
  if (!supported || perm === 'denied') return null
  return (
    <IconButton
      label={perm === 'granted' ? t('alerts.enabled') : t('alerts.enable')}
      onClick={() => { if (perm !== 'granted') void Notification.requestPermission().then(setPerm) }}
      className={perm === 'granted' ? 'text-brand-600' : ''}
    >
      {perm === 'granted' ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
    </IconButton>
  )
}
