import { Clients } from '@shared/types'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

export type QrStatus = 'pending' | 'expired' | 'timeout' | 'reading' | 'uninitialized'

interface WhatsAppContextType {
  sessions: Clients[]
  isLoading: boolean
  pendingQr: { sessionId: string; qr: string } | null
  qrStatus: QrStatus
  addSession: () => Promise<void>
  removeSession: (id: string) => Promise<void>
}

const WhatsAppContext = createContext<WhatsAppContextType | null>(null)

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Clients[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingQr, setPendingQr] = useState<{ sessionId: string; qr: string } | null>(null)
  const [qrStatus, setQrStatus] = useState<QrStatus>('uninitialized')

  useEffect(() => {
    window.api.whatsapp.listSessions().then((initial) => {
      setSessions(initial)
      setIsLoading(false)
    })

    const offSessions = window.api.whatsapp.onSessionsUpdated((updated) => {
      setSessions(updated)
      setPendingQr((prev) => {
        if (!prev) return prev
        const session = updated.find((s: Clients) => s.id === prev.sessionId)
        return session?.status === 'connected' ? null : prev
      })
    })

    const offQr = window.api.whatsapp.onQr((data) => setPendingQr(data))
    const offQrStatus = window.api.whatsapp.onQrStatus((data) => {
      if (data.status === 'expired') setPendingQr(null)
      setQrStatus(data.status)
    })

    const offConnected = window.api.whatsapp.onConnected((data) => {
      setPendingQr((prev) => (prev?.sessionId === data.sessionId ? null : prev))
    })

    const offStatus = window.api.whatsapp.onStatus((data) => {
      if (data.status === 'inChat' || data.status === 'isLogged') {
        setPendingQr((prev) => (prev?.sessionId === data.sessionId ? null : prev))
      }
    })

    return () => {
      offSessions()
      offQr()
      offQrStatus()
      offConnected()
      offStatus()
    }
  }, [])

  const addSession = useCallback(async () => {
    await window.api.whatsapp.addSession()
  }, [])

  const removeSession = useCallback(async (id: string) => {
    await window.api.whatsapp.removeSession(id)
  }, [])

  return (
    <WhatsAppContext.Provider
      value={{ qrStatus, sessions, isLoading, pendingQr, addSession, removeSession }}
    >
      {children}
    </WhatsAppContext.Provider>
  )
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext)
  if (!context) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider')
  }
  return context
}
