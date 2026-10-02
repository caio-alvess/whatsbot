import { QrStatus } from '@/hooks/useWhatsapp'
import { Button } from './ui/button'
import { Clients } from '@shared/types'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ConnectScreenProps {
  pendingQr: { sessionId: string; qr: string } | null
  onConnect: () => void
  sessions: Clients[]
  qrStatus: QrStatus
}

export function ConnectScreen({ pendingQr, qrStatus, onConnect, sessions }: ConnectScreenProps) {
  const [hasClicked, setClicked] = useState(false)
  const isConnecting = sessions.some((s) => s.status === 'connecting')
  const isReading = qrStatus === 'reading'

  function handleClick() {
    setClicked(true)
    onConnect()
  }

  useEffect(() => {
    return () => {
      setClicked(false)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
      {pendingQr ? (
        <>
          {isReading && <span>reading...</span>}
          <img src={pendingQr.qr} alt="WhatsApp QR Code" className="w-64 h-64" />
          <p>Escaneie com o WhatsApp pra conectar</p>
        </>
      ) : isConnecting ? (
        <p>Conectando...</p>
      ) : (
        <Button disabled={hasClicked} onClick={handleClick}>
          {hasClicked ? (
            <>
              Conectando... <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </>
          ) : (
            'Conectar WhatsApp'
          )}
        </Button>
      )}
    </div>
  )
}
