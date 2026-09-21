import { useEffect, useState, useCallback } from 'react'

interface Session {
  id: string
  number: string | null
  status: 'connecting' | 'connected' | 'disconnected'
}

export function useWhatsApp() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingQr, setPendingQr] = useState<{ sessionId: string; qr: string } | null>(null)

  useEffect(() => {
    window.api.whatsapp.listSessions().then((initial) => {
      setSessions(initial)
      setIsLoading(false)
    })

    const offSessions = window.api.whatsapp.onSessionsUpdated((updated) => {
      setSessions(updated)
      // fallback: se a sessão do QR pendente já está conectada, limpa
      setPendingQr((prev) => {
        if (!prev) return prev
        const session = updated.find((s: Session) => s.id === prev.sessionId)
        return session?.status === 'connected' ? null : prev
      })
    })

    const offQr = window.api.whatsapp.onQr((data) => setPendingQr(data))

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

  return { sessions, isLoading, pendingQr, addSession, removeSession }
}
