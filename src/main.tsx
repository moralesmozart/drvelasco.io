import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import App from './App'
import { startUpdateCheck } from './lib/updateCheck'

// Share-friendly form link without "#": …/?f=<slug> → …/#/f/<slug>
const shared = new URLSearchParams(location.search).get('f')
if (shared && /^[\w-]{1,64}$/.test(shared)) {
  history.replaceState(null, '', `${location.pathname}#/f/${shared}`)
}

// A note for whoever opens the browser console (and a warning against "paste this here" scams)
if (import.meta.env.PROD) {
  const big = 'font: 600 56px/1.1 Georgia, "Times New Roman", serif; color: #2c6a5a; padding: 8px 0;'
  const txt = 'font: 15px/1.5 system-ui, sans-serif; color: #334155;'
  const warn = 'font: 700 15px/1.5 system-ui, sans-serif; color: #e11d48;'
  console.log('%cdrvelasco', big)
  console.log('%cObrigado pela curiosidade! 👋 Esta é uma área privada: os dados dos pacientes ficam protegidos no servidor e só a equipe tem acesso.\n¡Gracias por tu curiosidad! Esta es un área privada: los datos de los pacientes están protegidos en el servidor.\nThanks for exploring! This is a private area: patient data is protected on the server.', txt)
  console.log('%c⚠️ Se alguém pediu para você colar algo aqui, é golpe. · Si alguien te pidió pegar algo aquí, es una estafa. · If someone asked you to paste something here, it is a scam.', warn)
}

startUpdateCheck()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
