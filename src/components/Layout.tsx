import { Briefcase, ClipboardList, FileCheck, HeartPulse, Inbox, LogOut, Plane, RotateCcw, Stethoscope, Users, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { LANGS } from '../lib/i18n'
import { isDemo } from '../lib/repo'
import { resetDemo } from '../lib/demoRepo'
import { IconButton } from './ui'

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

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
      <img src="./favicon.svg" alt="" className="h-7 w-7" />
      Pipe Lite
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
          {user && (
            <>
              <span className="hidden h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800 sm:grid" title={user.email}>
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <IconButton label={t('auth.logout')} onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </IconButton>
            </>
          )}
        </div>
      </header>
    </>
  )
}
