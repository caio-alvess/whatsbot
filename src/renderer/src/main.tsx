import { Toaster } from '@/components/ui/sonner'
import './assets/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { WhatsAppProvider } from './contexts/whatsapp-context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WhatsAppProvider>
      <Toaster richColors position="top-center" />
      <App />
    </WhatsAppProvider>
  </StrictMode>
)
