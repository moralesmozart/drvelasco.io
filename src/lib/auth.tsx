import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import type { AvatarChoice } from '../components/Avatar'

interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: AvatarChoice
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  signIn(email: string, password: string): Promise<'ok' | 'invalid' | 'not_admin'>
  enterDemo(): void
  updateName(name: string): Promise<void>
  updateAvatar(avatar: AvatarChoice): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const demoUser = (): AuthUser => {
  let name = 'Demo'
  let avatar: AvatarChoice | undefined
  try {
    name = localStorage.getItem('demo-name') || 'Demo'
    avatar = JSON.parse(localStorage.getItem('demo-avatar') || 'null') ?? undefined
  } catch { /* ignore */ }
  return { id: 'demo', email: 'demo@example.com', name, avatar }
}

function nameFromEmail(email: string) {
  const base = email.split('@')[0].replace(/[._-]+/g, ' ')
  return base.replace(/\b\w/g, (c) => c.toUpperCase())
}

async function checkAdmin(userId: string) {
  const { data } = await supabase!.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle()
  return Boolean(data)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      try { if (sessionStorage.getItem('demo-session')) setUser(demoUser()) } catch { /* ignore */ }
      setLoading(false)
      return
    }
    const apply = async (session: { user: { id: string; email?: string; user_metadata?: { name?: string; avatar?: AvatarChoice } } } | null) => {
      if (session && (await checkAdmin(session.user.id))) {
        const email = session.user.email ?? ''
        setUser({ id: session.user.id, email, name: session.user.user_metadata?.name ?? nameFromEmail(email), avatar: session.user.user_metadata?.avatar })
      } else {
        setUser(null)
      }
      setLoading(false)
    }
    supabase!.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase!.auth.onAuthStateChange((_e, session) => { void apply(session) })
    return () => sub.subscription.unsubscribe()
  }, [])

  // "Last activity" for the team list: ping while the app is open (the server keeps at most one write per 2 min)
  const signedIn = !!user && isSupabaseConfigured
  useEffect(() => {
    if (!signedIn) return
    const ping = () => { if (document.visibilityState === 'visible') void supabase!.rpc('touch_presence') }
    ping()
    const id = setInterval(ping, 3 * 60_000)
    document.addEventListener('visibilitychange', ping)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', ping) }
  }, [signedIn])

  const value: AuthState = {
    user,
    loading,
    async signIn(email, password) {
      if (!supabase) return 'invalid'
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) return 'invalid'
      if (!(await checkAdmin(data.user.id))) {
        await supabase.auth.signOut()
        return 'not_admin'
      }
      return 'ok'
    },
    enterDemo() {
      try { sessionStorage.setItem('demo-session', '1') } catch { /* ignore */ }
      setUser(demoUser())
    },
    async updateName(name) {
      const clean = name.trim()
      if (!clean || !user) return
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ data: { name: clean } })
        if (error) throw error
      } else {
        try { localStorage.setItem('demo-name', clean) } catch { /* ignore */ }
      }
      setUser({ ...user, name: clean })
    },
    async updateAvatar(avatar) {
      if (!user) return
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ data: { avatar } })
        if (error) throw error
      } else {
        try { localStorage.setItem('demo-avatar', JSON.stringify(avatar)) } catch { /* ignore */ }
      }
      setUser({ ...user, avatar })
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
      try { sessionStorage.removeItem('demo-session') } catch { /* ignore */ }
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
