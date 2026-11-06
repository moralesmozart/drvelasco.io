import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Spinner } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import Board from './pages/Board'
import FormBuilder from './pages/FormBuilder'
import { lazy, Suspense } from 'react'
const Templates = lazy(() => import('./pages/Templates'))
import Home from './pages/Home'
import Login from './pages/Login'
import PublicForm from './pages/PublicForm'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: true } } })

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  return user ? children : <Navigate to="/login" replace />
}

// HashRouter: GitHub Pages serves static files only, so routes live after the '#'.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/f/:slug" element={<PublicForm />} />
            <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/pipe/:pipeId" element={<RequireAuth><Board /></RequireAuth>} />
            <Route path="/pipe/:pipeId/form" element={<RequireAuth><FormBuilder /></RequireAuth>} />
            <Route path="/pipe/:pipeId/templates" element={<RequireAuth><Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner /></div>}><Templates /></Suspense></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  )
}
