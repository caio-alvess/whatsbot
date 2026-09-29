import { Clients } from '@shared/types'
import { BeforeSend, SendPayload } from '@/components/before-send'
import { useMessageQueue } from '@/hooks/use-messages-queue'
import { Sending } from '@/components/sending'

export function Home({ sessions }: { sessions: Clients[] }) {
  const { items, status, isPaused, banRisk, setContacts, start, pause, resume, stop } =
    useMessageQueue()

  async function handleSend({ contacts, text, delayConfig }: SendPayload) {
    setContacts(contacts)
    await start(
      text,
      delayConfig,
      async (contact, text) =>
        await window.api.whatsapp.sendText({
          sessionId: sessions[0].id,
          contact,
          text
        })
    )
    // await start(
    //   text,
    //   delayConfig,
    //   (phone, message) =>
    //     new Promise<boolean>((resolve, reject) => {
    //       setTimeout(() => {
    //         resolve(true)
    //       }, 2000)
    //     })
    // )
  }

  return (
    <>
      {status === 'running' || status === 'done' ? (
        <Sending
          items={items}
          isPaused={isPaused}
          banRisk={banRisk}
          onPause={pause}
          onResume={resume}
          onStop={stop}
        />
      ) : (
        <BeforeSend handleSend={handleSend} />
      )}
    </>
  )
}
