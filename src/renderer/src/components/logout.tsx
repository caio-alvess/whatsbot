import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function Logout({
  sessionId,
  removeSession
}: {
  sessionId: string | undefined
  removeSession: (id: string) => Promise<void>
}) {
  const [isLoading, setIsLoading] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    return () => {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!sessionId) {
      close()
      setIsLoading(false)
    }
  }, [sessionId])

  function close() {
    closeRef.current?.click()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Sair</AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Você vai sair da sua sessão atual do Whatsapp e terá que logar novamente para usar o
            aplicativo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose disabled={isLoading} render={<Button variant="ghost" />}>
            Cancelar
          </AlertDialogClose>

          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true)
              removeSession(sessionId!)
            }}
          >
            {isLoading && <Loader2 className="size-3 animate-spin" />}
            {isLoading ? 'Saindo...' : 'Sair da sessão'}
          </Button>

          <AlertDialogClose className={'hidden'} />
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
