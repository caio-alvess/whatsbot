// hooks/use-message-queue.ts
import { Contact } from '@shared/types'
import { useCallback, useRef, useState } from 'react'

export type ItemStatus = 'pending' | 'sending' | 'sent' | 'error'

export interface QueueItem {
  name: string
  phone: string
  status: ItemStatus
  errorMessage?: string
}

export interface DelayConfig {
  minMs: number
  maxMs: number
  maxPerHour: number
}

export type DelayProfile = 'conservative' | 'moderate' | 'fast' | 'custom'

export const PRESETS: Record<Exclude<DelayProfile, 'custom'>, DelayConfig> = {
  conservative: { minMs: 25_000, maxMs: 60_000, maxPerHour: 40 },
  moderate: { minMs: 10_000, maxMs: 30_000, maxPerHour: 80 },
  fast: { minMs: 3_000, maxMs: 8_000, maxPerHour: 200 }
}

const PERIOD = 60 * 60_000

export function estimateDuration(config: DelayConfig, count: number): number {
  if (count <= 0) return 0
  const avgDelay = (config.minMs + config.maxMs) / 2
  const totalDelay = avgDelay * count
  const hourlyWaits = Math.max(0, Math.floor((count - 1) / config.maxPerHour))
  return totalDelay + hourlyWaits * PERIOD
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function randomDelay(config: DelayConfig) {
  return Math.floor(Math.random() * (config.maxMs - config.minMs + 1)) + config.minMs
}

export function renderPhone(phone: string): string {
  const number = phone.replace(/\D/g, '').replace(/^55/, '')

  return number.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
}

export function useMessageQueue() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [banRisk, setBanRisk] = useState(false)
  const [status, setStatus] = useState<'pending' | 'running' | 'done'>('pending')

  const contactsRef = useRef<Contact[]>([])

  const pausedRef = useRef(false)
  const stoppedRef = useRef(false)
  const sentThisHourRef = useRef(0)
  const windowStartRef = useRef(Date.now())
  const consecutiveErrorsRef = useRef(0)

  const setContacts = useCallback((contacts: Contact[]) => {
    contactsRef.current = contacts
    setItems(contacts.map((c) => ({ ...c, status: 'pending' })))
  }, [])

  const updateItem = useCallback((phone: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.phone === phone ? { ...it, ...patch } : it)))
  }, [])

  const sleep = useCallback((ms: number, chunk = 500) => {
    return new Promise<void>(async (resolve) => {
      let remaining = ms
      while (remaining > 0 && !stoppedRef.current) {
        while (pausedRef.current && !stoppedRef.current) {
          await new Promise((r) => setTimeout(r, 300))
        }
        const wait = Math.min(chunk, remaining)
        await new Promise((r) => setTimeout(r, wait))
        remaining -= wait
      }
      resolve()
    })
  }, [])

  const start = useCallback(
    async (
      message: string,
      config: DelayConfig,
      sendFn: (contact: Contact, text: string) => Promise<boolean>
    ) => {
      const contacts = contactsRef.current
      if (contacts.length === 0) return

      stoppedRef.current = false
      pausedRef.current = false
      sentThisHourRef.current = 0
      windowStartRef.current = Date.now()
      consecutiveErrorsRef.current = 0
      setStatus('running')
      setBanRisk(false)
      setIsPaused(false)

      for (const contact of contacts) {
        if (stoppedRef.current) break

        while (pausedRef.current && !stoppedRef.current) {
          await new Promise((r) => setTimeout(r, 300))
        }
        if (stoppedRef.current) break

        if (Date.now() - windowStartRef.current > PERIOD) {
          sentThisHourRef.current = 0
          windowStartRef.current = Date.now()
        }

        if (sentThisHourRef.current >= config.maxPerHour) {
          const waitMs = PERIOD - (Date.now() - windowStartRef.current)
          await sleep(waitMs)
          sentThisHourRef.current = 0
          windowStartRef.current = Date.now()
        }

        updateItem(contact.phone, { status: 'sending' })

        try {
          const ok = await sendFn(contact, message)
          if (ok) {
            updateItem(contact.phone, { status: 'sent' })
            sentThisHourRef.current++
            consecutiveErrorsRef.current = 0
          } else {
            updateItem(contact.phone, { status: 'error', errorMessage: 'Falha no envio' })
            consecutiveErrorsRef.current++
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          updateItem(contact.phone, { status: 'error', errorMessage: msg })
          consecutiveErrorsRef.current++
        }

        if (consecutiveErrorsRef.current >= 4) setBanRisk(true)

        await sleep(randomDelay(config))
      }

      setStatus('done')
    },
    [sleep, updateItem]
  )

  const pause = useCallback(() => {
    pausedRef.current = true
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    setIsPaused(false)
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    pausedRef.current = false
    setIsPaused(false)
    setStatus('pending')
  }, [])

  return {
    items,
    status,
    isPaused,
    banRisk,
    contactsRef,
    setContacts,
    start,
    pause,
    resume,
    stop
  }
}
