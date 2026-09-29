import React from 'react'
import { BotMessageSquare } from 'lucide-react'
import { useWhatsApp } from '@/hooks/useWhatsapp'
import { renderPhone } from '@/hooks/use-messages-queue'
import { Badge } from '../ui/badge'
import { Logout } from '../logout'

function Layout({ children }: { children: React.ReactNode }) {
  const { sessions, removeSession } = useWhatsApp()

  return (
    <>
      <div className="container md:w-1/2 mx-auto mt-8">
        <header className="px-4 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 ">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg p-1.5">
                <BotMessageSquare />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-lg">Whatsbot</span>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {sessions[0]?.phone && (
                <div>
                  <Badge variant={'outline'}>
                    <span className="text-sm bg-background">{renderPhone(sessions[0].phone)}</span>
                  </Badge>
                </div>
              )}

              <Logout sessionId={sessions[0]?.id} removeSession={removeSession} />
            </div>
          </div>
        </header>
        <main className="px-4">{children}</main>
      </div>
    </>
  )
}

export default Layout
