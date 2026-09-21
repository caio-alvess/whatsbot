import { create, type Whatsapp } from '@wppconnect-team/wppconnect'
import { randomUUID } from 'crypto'
import type { BrowserWindow } from 'electron'
import Store from 'electron-store'
import { FolderHandler } from '../folder/handler'
import { resolve } from 'path'

interface SessionRecord {
  id: string
  number: string | null
  status: 'connecting' | 'connected' | 'disconnected'
}

// const store = new Store<{ sessions: SessionRecord[] }>()

export class WhatsAppManager {
  private clients = new Map<string, Whatsapp>()
  private startingLocks = new Set<string>() // evita duas tentativas simultâneas pro mesmo id
  private window: BrowserWindow | null = null
  private store: Store<{ sessions: SessionRecord[] }>
  private readonly ready: Promise<void>
  private readonly folderNameToken: string
  private handledDisconnects = new Set<string>() // evita chamar removeSession mais de uma vez pro mesmo evento

  constructor(config?: { store?: Store<{ sessions: SessionRecord[] }>; folderNameToken?: string }) {
    this.store = config?.store || new Store<{ sessions: SessionRecord[] }>()
    this.folderNameToken = config?.folderNameToken || 'tokens'
    this.ready = this.clearPossibleDeadSessions()
  }

  /**
   * Await untill dead sessions cleaning is complete. */
  async waitUntilReady() {
    await this.ready
  }

  setWindow(window: BrowserWindow) {
    this.window = window
  }

  private emit(channel: string, payload: unknown) {
    this.window?.webContents.send(channel, payload)
  }

  private getSessions(): SessionRecord[] {
    return this.store.get('sessions', [])
  }

  private saveSession(record: SessionRecord) {
    const sessions = this.getSessions().filter((s) => s.id !== record.id)
    sessions.push(record)
    this.store.set('sessions', sessions)
    this.emit('whatsapp:sessions-updated', sessions)
  }

  /**Danger: This will overwrite all session data. */
  private async overwriteSession(record: SessionRecord[]) {
    this.store.set('sessions', record)
    this.emit('whatsapp:sessions-updated', record)
  }

  private async removeSessionRecord(id: string) {
    const sessions = this.getSessions().filter((s) => s.id !== id)
    this.store.set('sessions', sessions)
    this.emit('whatsapp:sessions-updated', sessions)
  }

  listSessions(): SessionRecord[] {
    return this.getSessions()
  }

  // Called on app start to reconnect any previously authenticated sessions
  async restoreSessions() {
    const sessions = this.getSessions()
    for (const session of sessions) {
      await this.startSession(session.id)
    }
  }

  async addSession(): Promise<string> {
    await this.ready
    const id = randomUUID()
    await this.startSession(id)
    return id
  }

  //keeps synced tokens folder and session config file by deleting dismatched sessions
  private async clearPossibleDeadSessions() {
    const tokensPath = resolve(process.cwd(), this.folderNameToken)

    const synced = await getSynced(tokensPath, this.store)

    if (synced === 'no-tokens') {
      await FolderHandler.excludeFolder(tokensPath)
      this.overwriteSession([])
      return
    }

    const unsyncTokens = (await FolderHandler.readAllFolders(tokensPath)).filter(
      (token) => !synced.tokens.includes(token)
    )

    for (const unsyncToken of unsyncTokens) {
      await FolderHandler.excludeFolder(tokensPath, unsyncToken)
    }
    await this.overwriteSession(synced.sessions)
  }

  private async startSession(id: string, attempt = 1) {
    if (this.startingLocks.has(id)) {
      console.warn(`Session ${id} is already running. Ignored.`)
      return
    }

    this.startingLocks.add(id)
    this.saveSession({ id, number: null, status: 'connecting' })

    let client: Whatsapp | undefined

    try {
      client = await create({
        session: id,
        folderNameToken: this.folderNameToken,
        autoClose: 60000,
        catchQR: (base64Qr) => {
          this.emit('whatsapp:qr', { sessionId: id, qr: base64Qr })
        },
        statusFind: (status) => {
          this.emit('whatsapp:status', { sessionId: id, status })
        },
        headless: true,
        logQR: false
      })

      this.clients.set(id, client)

      const reallyConnected = await client.isConnected()

      if (!reallyConnected) {
        throw new Error('Session was restaurad but not connected (token stale)')
      }

      const hostDevice = await client.getHostDevice()
      const number = hostDevice?.wid?.user ?? hostDevice?.me?.user ?? null

      this.saveSession({ id, number, status: 'connected' })
      this.emit('whatsapp:connected', { sessionId: id, number })

      client.onStateChange((state) => {
        if (state === 'CONFLICT' || state === 'UNPAIRED' || state === 'UNLAUNCHED') {
          if (this.handledDisconnects.has(id)) return
          this.handledDisconnects.add(id)
          this.cleanupDeadSession(id).catch((err) => {
            console.error(`Falha ao limpar sessão morta ${id}:`, err)
          })
        }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`Sessão ${id} tentativa ${attempt} falhou:`, message)

      this.clients.delete(id)

      // SEMPRE tenta fechar o browser órfão, seja qual for o erro,
      // pra não travar a userDataDir pra próxima tentativa
      try {
        await client?.close()
      } catch {
        // já pode estar fechado, ignora
      }

      this.startingLocks.delete(id)

      const maxAttempts = 5
      if (attempt >= maxAttempts) {
        this.saveSession({ id, number: null, status: 'disconnected' })
        this.emit('whatsapp:qr-timeout', { sessionId: id })
        return
      }

      // Retry genérico: qualquer erro (timeout de injeção, auto-close, etc.)
      // dá nova chance, não só 'Auto Close Called'
      this.emit('whatsapp:qr-expired', { sessionId: id })
      await this.startSession(id, attempt + 1)
      return
    }

    this.startingLocks.delete(id)
  }

  private async cleanupDeadSession(id: string) {
    this.startingLocks.delete(id)
    const client = this.clients.get(id)
    if (client) {
      try {
        await client.close()
      } catch {
        // já pode estar fechado, ignora
      }
      this.clients.delete(id)
    }
    this.handledDisconnects.delete(id)
    await this.removeSessionRecord(id)
  }
  async removeSession(id: string) {
    this.startingLocks.delete(id)
    const client = this.clients.get(id)
    if (client) {
      try {
        await client.logout()
      } catch (err) {
        // sessão pode já estar sem contexto ativo (ex: WhatsApp Web caiu) — ignora e segue pro close
        console.warn(`Logout failed to ${id}, followed by close:`, err)
      }
      try {
        await client.close()
      } catch {}
      this.clients.delete(id)
    }
    this.handledDisconnects.delete(id)
    await this.removeSessionRecord(id)
  }
}

async function getSynced(tokensFolder: string, store: Store<{ sessions: SessionRecord[] }>) {
  const tokens = await FolderHandler.readAllFolders(tokensFolder)

  if (tokens.length === 0) return 'no-tokens'

  const sessions = store.get('sessions')
  const tokensIds = new Set(tokens)

  const syncedSessions = sessions.filter((session) => tokensIds.has(session.id))
  const syncedTokens = tokens.filter((token) => sessions.some((session) => session.id === token))

  return {
    sessions: syncedSessions,
    tokens: syncedTokens
  }
}
