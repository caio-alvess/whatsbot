import { useCallback, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  UploadCloud,
  Paperclip,
  Send,
  Settings2,
  Loader2,
  CheckCircle2,
  FileSpreadsheet,
  Trash2
} from 'lucide-react'
import { useSheet } from '@/hooks/use-sheet'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DelaySelector } from '@/components/delay-selector'
import { PRESETS, type DelayConfig, type DelayProfile } from '@/hooks/use-messages-queue'
import { Contact } from '@shared/types'

type ParsedSheet = {
  fileName: string
  fileSize: number
  columns: string[]
  rows: Record<string, unknown>[]
  raw: File
}

const payloadSchema = z.object({
  sheet: z.instanceof(ArrayBuffer, { error: 'Por favor, selecione uma planilha válida.' }),
  text: z.string().nonempty('Este campo não pode estar vazio.')
})

export type Payload = z.infer<typeof payloadSchema>

export interface SendPayload {
  contacts: Contact[]
  text: string
  delayConfig: DelayConfig
}

export function BeforeSend({ handleSend }: { handleSend: (data: SendPayload) => void }) {
  const { startPreview, sheetToJson } = useSheet()
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedSheet | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [delay, setDelay] = useState<{ profile: DelayProfile; config: DelayConfig }>({
    profile: 'conservative',
    config: PRESETS.conservative
  })

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<Payload>({
    resolver: zodResolver(payloadSchema),
    defaultValues: { sheet: undefined, text: '' }
  })

  const message = watch('text')

  async function parseFile(file: File) {
    setParsing(true)
    const buf = await file.arrayBuffer()
    const preview = await startPreview({ name: file.name, size: file.size, buf })
    setParsing(false)

    if (!preview) {
      toast.error('A planilha está vazia ou é inválida.')
      return
    }

    setParsed(preview)
    setValue('sheet', buf, { shouldValidate: true, shouldDirty: true })
  }

  const handleFiles = useCallback((files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const ok = /\.(xlsx|xls|csv)$/i.test(file.name)
    if (!ok) {
      toast.error('Por favor, envie um arquivo .xlsx ou .csv')
      return
    }
    parseFile(file)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const clearSheet = useCallback(() => {
    setParsed(null)
    setValue('sheet', undefined as unknown as ArrayBuffer, { shouldValidate: true })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [setValue])

  const usedVariables = useMemo(() => {
    const found = new Set<string>()
    const re = /\{\{\s*([^}]+?)\s*}}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(message ?? '')) !== null) {
      found.add((m[1] ?? '').trim())
    }
    return found
  }, [message])

  async function onSubmit(data: Payload) {
    try {
      const sheet = (await sheetToJson(data.sheet)).data as { name: string; phone: string }[]

      if (sheet.length === 0) {
        toast.error('Erro de envio.', { description: 'Esta planilha está vazia ou é inválida' })
        return
      }

      const contacts: Contact[] = sheet.map((row) => ({
        name: String(row['name'] ?? row['Nome'] ?? ''),
        phone: String(row['phone'] ?? row['Celular'] ?? ''),
        row
      }))

      if (contacts.some((c) => !c.phone)) {
        toast.error('Algumas linhas estão sem telefone válido.')
        return
      }

      handleSend({ contacts, text: data.text, delayConfig: delay.config })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Erro de envio.', { description: msg })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            Planilha
          </CardTitle>
          <CardDescription>Faça o upload de apenas um arquivo .xlsx ou .csv</CardDescription>
        </CardHeader>
        <CardContent>
          {!parsed ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
              className={
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ' +
                (dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/40')
              }
            >
              {parsing ? (
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              ) : (
                <UploadCloud className="size-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {parsing ? 'Lendo arquivo…' : 'Clique ou arraste e solte aqui'}
                </p>
                <p className="text-xs text-muted-foreground">.xlsx ou .csv, até 20MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{parsed.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {parsed.rows.length} linhas · {parsed.columns.length} colunas ·{' '}
                      {(parsed.fileSize / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={clearSheet}>
                  <Trash2 className="size-4" /> Remover
                </Button>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Colunas detectadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {parsed.columns.map((col) => (
                    <Badge key={col} variant="secondary" className="font-mono text-xs">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Preview (primeiras 5 linhas)
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {parsed.columns.map((col) => (
                          <th key={col} className="px-3 py-2 font-medium whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {parsed.columns.map((col) => (
                            <td
                              key={col}
                              className="px-3 py-2 whitespace-nowrap text-muted-foreground"
                            >
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {errors.sheet && <p className="mt-2 text-xs text-destructive">{errors.sheet.message}</p>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="size-4 text-muted-foreground" />
            Velocidade de envio
          </CardTitle>
          <CardDescription>Escolha o intervalo entre mensagens.</CardDescription>
        </CardHeader>
        <CardContent>
          <DelaySelector
            contactCount={parsed?.rows.length ?? 0}
            value={delay}
            onChange={setDelay}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="size-4 text-muted-foreground" />
            Mensagem
          </CardTitle>
          <CardDescription>
            Use <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{column}}'}</code> para
            inserir um valor para cada linha. Clique em uma variável para adicioná-la ao cursor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsed && parsed.columns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parsed.columns.map((col) => (
                <Button
                  key={col}
                  type="button"
                  variant={usedVariables.has(col) ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 gap-1 font-mono text-xs"
                  onClick={() => {
                    const textarea = document.getElementById(
                      'message-box'
                    ) as HTMLTextAreaElement | null
                    const token = `{{${col}}}`
                    const current = message ?? ''
                    const start = textarea?.selectionStart ?? current.length
                    const end = textarea?.selectionEnd ?? current.length
                    const next = current.slice(0, start) + token + current.slice(end)
                    setValue('text', next, { shouldValidate: true, shouldDirty: true })
                    requestAnimationFrame(() => {
                      textarea?.focus()
                      const pos = start + token.length
                      textarea?.setSelectionRange(pos, pos)
                    })
                  }}
                >
                  {usedVariables.has(col) && <CheckCircle2 className="size-3" />}
                  {col}
                </Button>
              ))}
            </div>
          )}
          <Controller
            name="text"
            control={control}
            render={({ field }) => (
              <Textarea
                id="message-box"
                {...field}
                placeholder="Hi {{name}}, your order {{order_id}} is ready…"
                className="min-h-32 resize-y font-mono text-sm"
              />
            )}
          />
          {errors.text && <p className="text-xs text-destructive">{errors.text.message}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !parsed}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Enviando…
            </>
          ) : (
            <>
              <Send className="size-4" /> Enviar
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
