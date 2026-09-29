import type { Clients } from '@shared/types'
import { useEffect, useState, useCallback } from 'react'

export type QrStatus = 'pending' | 'expired' | 'timeout' | 'reading' | 'uninitialized'

export function useWhatsApp() {
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
      // fallback: se a sessão do QR pendente já está conectada, limpa
      setPendingQr((prev) => {
        if (!prev) return prev
        const session = updated.find((s: Clients) => s.id === prev.sessionId)
        return session?.status === 'connected' ? null : prev
      })
    })

    const offQr = window.api.whatsapp.onQr((data) => setPendingQr(data))
    const offQrStatus = window.api.whatsapp.onQrStatus((data) => {
      if (data.status === 'expired') setPendingQr(null)
      return setQrStatus(data.status)
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

  return { qrStatus, sessions, isLoading, pendingQr, addSession, removeSession }
}
