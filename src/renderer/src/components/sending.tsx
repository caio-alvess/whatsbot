// components/sending.tsx
import { CheckCircle2, AlertCircle, Loader2, Clock, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { QueueItem, ItemStatus } from '@/hooks/use-messages-queue'

const statusMeta: Record<ItemStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pendente', icon: Clock, className: 'text-muted-foreground' },
  sending: { label: 'Enviando...', icon: Loader2, className: 'text-foreground animate-pulse' },
  sent: { label: 'Enviado', icon: CheckCircle2, className: 'text-chart-2 text-emerald-600' },
  error: { label: 'Erro', icon: AlertCircle, className: 'text-destructive' }
}

export function Sending({
  items,
  isPaused,
  banRisk,
  onPause,
  onResume,
  onStop
}: {
  items: QueueItem[]
  isPaused: boolean
  banRisk: boolean
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  const total = items.length
  const sent = items.filter((i) => i.status === 'sent').length
  const errors = items.filter((i) => i.status === 'error').length
  const done = sent + errors
  const pct = total ? (done / total) * 100 : 0

  return (
    <div className="space-y-4">
      {banRisk && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldAlert className="size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Risco de banimento detectado</p>
              <p className="text-xs text-muted-foreground">
                Vários erros consecutivos de envio. O WhatsApp pode estar limitando ou bloqueando
                este número. Considere pausar o envio. Isso também pode significar que alguns
                números estão incorretos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Progresso do envio</CardTitle>
          <div className="flex gap-2">
            {isPaused ? (
              <Button size="sm" onClick={onResume}>
                Retomar
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onPause}>
                Pausar
              </Button>
            )}
            {done === total ? (
              <Button size="sm" variant="outline" onClick={onStop}>
                Fechar
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={onStop}>
                Parar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-2.5 flex-1" />
            <span className="text-sm font-medium tabular-nums">
              {done}/{total}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-chart-2">Enviados: {sent}</span>
            <span className="text-destructive">Erros: {errors}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="max-h-96 divide-y overflow-y-auto p-0">
          {items.map((item) => {
            const meta = statusMeta[item.status]
            const Icon = meta.icon
            return (
              <div key={item.phone} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.phone}</p>
                  {item.errorMessage && (
                    <p className="text-xs text-destructive">{item.errorMessage}</p>
                  )}
                </div>
                <Badge variant="outline" className={`gap-1.5 ${meta.className}`}>
                  <Icon className="size-3.5" />
                  {meta.label}
                </Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

/* // pages/Sending.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Clock, Users, WifiOff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { Status } from '@shared/types'
import { useSenderStore } from '@/stores/sender.store'

function formatPhone(phone: string): string {
  const number = phone.replace(/\D/g, '').replace(/^55/, '')

  return number.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
}

const statusMeta: Record<
  Status,
  { label: string; icon: typeof Users; variant: 'secondary' | 'outline' | 'destructive' }
> = {
  pending: { label: 'Aguardando início', icon: Clock, variant: 'outline' },
  sending: { label: 'Enviando...', icon: Loader2, variant: 'secondary' },
  delaying: { label: 'Pausado (limite/hora)', icon: Clock, variant: 'secondary' },
  completed: { label: 'Concluído', icon: CheckCircle2, variant: 'outline' },
  error: { label: 'Erro no envio', icon: AlertCircle, variant: 'destructive' }
}

// ---------- Card isolado: só re-renderiza pela sua própria sessão ----------
function SessionCard({ sessionId, name }: { sessionId: string; name: string }) {
  const status = useSenderStore((s) => s.statuses[sessionId] ?? 'pending')
  const progress = useSenderStore((s) => s.progresses[sessionId])

  const meta = statusMeta[status]
  const Icon = meta.icon
  const total = progress?.total ?? 0
  const sent = (progress?.success ?? 0) + (progress?.failure ?? 0)
  const pct = total ? (sent / total) * 100 : 0
  const isPaused = status === 'delaying'
  const canToggle = status === 'sending' || status === 'delaying'

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border bg-background">
            <Icon
              className={`size-5 ${status === 'sending' ? 'animate-spin' : ''} ${
                status === 'completed' ? 'text-chart-2' : ''
              } ${status === 'error' ? 'text-destructive' : ''}`}
            />
          </span>
          <div>
            <h2 className="text-sm font-semibold leading-none">{name}</h2>
            <Badge variant={meta.variant} className="mt-2 font-normal">
              {meta.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" /> Processados
          </span>
          <span className="font-semibold tabular-nums">
            {sent} / {total}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2.5 flex-1 transition-all duration-500" />
          <span className="w-12 text-right text-sm font-medium tabular-nums">
            {Math.round(pct)}%
          </span>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted px-3 py-2">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5" /> Sucesso
            </p>
            <p className="text-lg font-semibold tabular-nums">{progress?.success ?? 0}</p>
          </div>
          <div className="rounded-xl bg-muted px-3 py-2">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5" /> Erros
            </p>
            <p className="text-lg font-semibold tabular-nums text-destructive">
              {progress?.failure ?? 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Card de sessão desconectada: fonte de dados diferente (whatsapp:*, não sender:*) ----------
function DisconnectedCard({ name, phone }: { name: string; phone: string }) {
  return (
    <Card className="opacity-60">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-background">
          <WifiOff className="size-5 text-destructive" />
        </span>
        <div>
          <h2 className="text-sm font-semibold leading-none">
            {formatPhone(phone)}{' '}
            {name && <span className=" font-semibold truncate opacity-80">({name})</span>}
          </h2>
          <Badge variant="destructive" className="mt-2 font-normal">
            Sessão desconectada
          </Badge>
        </div>
      </CardHeader>
    </Card>
  )
}

// ---------- Página ----------
export function Sending() {
  const queryClient = useQueryClient()

  const { data: sessions = [] } = useQuery({
    queryKey: ['whatsapp', 'sessions'],
    queryFn: () => window.api.whatsapp.listSessions()
  })

  // mantém a lista de sessões sincronizada quando o main process avisa mudanças
  useEffect(() => {
    const unsubscribe = window.api.whatsapp.onSessionsUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'sessions'] })
    })
    return () => {
      unsubscribe()
    }
  }, [queryClient])

  // resumo agregado: única parte que precisa ler a store inteira
  const allProgresses = useSenderStore((s) => s.progresses)
  const totals = sessions.reduce(
    (acc, session) => {
      const p = allProgresses[session.id]
      return {
        sent: acc.sent + (p?.success ?? 0) + (p?.failure ?? 0),
        total: acc.total + (p?.total ?? 0),
        success: acc.success + (p?.success ?? 0),
        errors: acc.errors + (p?.failure ?? 0)
      }
    },
    { sent: 0, total: 0, success: 0, errors: 0 }
  )

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monitor de disparos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Progresso em tempo real de cada sessão de envio.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Enviados</p>
            <p className="font-semibold tabular-nums">
              {totals.sent}/{totals.total}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Sucesso</p>
            <p className="font-semibold tabular-nums">{totals.success}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Erros</p>
            <p className="font-semibold tabular-nums text-destructive">{totals.errors}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        {sessions.map((session) =>
          session.connected ? (
            <SessionCard key={session.id} sessionId={session.id} name={session.name} />
          ) : (
            <DisconnectedCard key={session.id} phone={session.phone} name={session.name} />
          )
        )}
      </div>
    </div>
  )
}
 */
