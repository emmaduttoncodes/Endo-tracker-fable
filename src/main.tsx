import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/600-italic.css'
import App from './App'
import './styles.css'

registerSW({ immediate: true })

// Ask the browser to protect IndexedDB from storage-pressure eviction —
// this is the user's only copy of their health data.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
