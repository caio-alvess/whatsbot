import { QrStatus } from '@/hooks/useWhatsapp'
import { Button } from './ui/button'
import { Clients } from '@shared/types'

interface ConnectScreenProps {
  pendingQr: { sessionId: string; qr: string } | null
  onConnect: () => void
  sessions: Clients[]
  qrStatus: QrStatus
}

export function ConnectScreen({ pendingQr, qrStatus, onConnect, sessions }: ConnectScreenProps) {
  const isConnecting = sessions.some((s) => s.status === 'connecting')
  const isReading = qrStatus === 'reading'

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
        <Button onClick={onConnect}>Conectar WhatsApp</Button>
      )}
    </div>
  )
}
