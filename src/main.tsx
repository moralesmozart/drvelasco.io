import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import App from './App'

// Share-friendly form link without "#": …/?f=<slug> → …/#/f/<slug>
const shared = new URLSearchParams(location.search).get('f')
if (shared && /^[\w-]{1,64}$/.test(shared)) {
  history.replaceState(null, '', `${location.pathname}#/f/${shared}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
