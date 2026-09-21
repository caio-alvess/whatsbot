import { useWhatsApp } from './hooks/useWhatsapp'

function App(): React.JSX.Element {
  const { sessions, isLoading, pendingQr, addSession } = useWhatsApp()

  if (isLoading) return <div>Loading...</div>

  const hasConnectingSession = sessions.some((s) => s.status === 'connecting')
  const hasConnectedSession = sessions.some((s) => s.status === 'connected')

  return (
    <div className="action">
      <div className="flex flex-col items-center gap-4">
        {pendingQr ? (
          <>
            <img src={pendingQr.qr} alt="WhatsApp QR Code" className="w-64 h-64" />
            <p>Scan with WhatsApp to connect</p>
          </>
        ) : hasConnectingSession ? (
          <p>Reconnecting to WhatsApp...</p>
        ) : hasConnectedSession ? (
          <p>Connected ✅</p> // replace with your real connected UI / add-another-number button
        ) : (
          <button
            disabled={hasConnectingSession}
            onClick={addSession}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Connect WhatsApp
          </button>
        )}
      </div>
    </div>
  )
}

export default App
