import { Component, type ReactNode } from 'react'
import i18n from '../lib/i18n'

/** Last line of defence: an unexpected error shows a friendly message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error(error) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lift">
          <p className="text-lg font-semibold text-slate-900">{i18n.t('common.error')}</p>
          <button onClick={() => { window.location.hash = '#/'; window.location.reload() }} className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {i18n.t('common.reload')}
          </button>
        </div>
      </div>
    )
  }
}
