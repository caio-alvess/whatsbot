import { ConnectScreen } from './components/connect-screen'
import Layout from './components/patterns/Layout'
import { useWhatsApp } from './contexts/whatsapp-context'

import { Home } from './pages/home'

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App(): React.JSX.Element {
  const { sessions, isLoading, pendingQr, addSession, qrStatus } = useWhatsApp()

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>
  }

  const hasConnectedSession = sessions.some((s) => s.status === 'connected')

  if (!hasConnectedSession) {
    return (
      <ConnectScreen
        pendingQr={pendingQr}
        qrStatus={qrStatus}
        onConnect={addSession}
        sessions={sessions}
      />
    )
  }

  return (
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Routes>
            <Route path="/" element={<Home sessions={sessions} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </QueryClientProvider>
    </HashRouter>
  )
}

export default App
