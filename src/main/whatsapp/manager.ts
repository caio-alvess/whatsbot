import { create, type Whatsapp } from '@wppconnect-team/wppconnect'
import { randomUUID } from 'crypto'
import { FolderHandler } from '../folder/handler'
import { resolve } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { ClientsDatabase } from '../db/tables/client.db'
import { Clients } from '../db/database'
import { PartialBy } from '../globals.types'
import { Emitter } from '../utils/emitter'
import { resolveChromeExecutablePath } from '../lib/resolve-chrome'

interface SessionHandle {
  client: Whatsapp
  pid: number | null
}

export interface Contact {
  name: string
  phone: string
  row: Record<string, unknown> // todas as colunas originais, para templating livre
}

const execPromise = promisify(exec)

export class WhatsAppManager {
  private clients = new Map<string, SessionHandle>()
  private startingLocks = new Set<string>() // evita duas tentativas simultâneas pro mesmo id
  // private window: BrowserWindow | null = null
  // private store: Store<{ sessions: Clients[] }>
  private emitter: Emitter | null = null
  private clientsDb: ClientsDatabase
  private readonly ready: Promise<void>
  private readonly folderNameToken: string
  private handledDisconnects = new Set<string>() // evita chamar removeSession mais de uma vez pro mesmo evento
  private cancelledSessions = new Set<string>() // NOVO
  private killer: Killer

  constructor(config: { clientsDb: ClientsDatabase; folderNameToken?: string }) {
    // this.store = config?.store || new Store<{ sessions: Clients[] }>()
    this.clientsDb = config.clientsDb
    this.folderNameToken = config?.folderNameToken || 'tokens'
    this.ready = this.clearPossibleDeadSessions()
    this.killer = new Killer()
  }

  /**
   * Await untill dead sessions cleaning is complete. */
  async waitUntilReady() {
    await this.ready
  }

  getClients() {
    return this.clients
  }

  setEmitter(emitter: Emitter) {
    this.emitter = emitter
  }

  emit(channel: string, payload: unknown) {
    if (!this.emitter) throw new TypeError('Emitter is undefined')
    this.emitter.emit(channel, payload)
  }

  async sendText({
    sessionId,
    text,
    contact
  }: {
    sessionId: string
    text: string
    contact: Contact
  }) {
    const client = this.clients.get(sessionId)?.client
    if (!client) throw new Error('No connected session')
    console.log('in, ', client.session)

    try {
      const fPhone = formatPhoneNumber(contact.phone)
      const fText = renderMessageText(text, contact.row)

      console.log(fPhone, fText, contact)

      const res = await client.sendText(fPhone, fText)

      if ((res as any)?.isSendFailure) {
        return false
      }

      return true
    } catch (error) {
      // const err = error as Error
      // if (err.message.includes('No LID') || err.message.startsWith('ERRPHONE')) return false;
      return false
    }
  }

  listSessions(): Clients[] {
    // return this.store.get('sessions', [])
    return this.clientsDb.findAll()
  }

  private saveSession(record: PartialBy<Clients, 'id'>) {
    this.clientsDb.upsertClient(record)
    const sessions = this.listSessions()

    this.emit('whatsapp:sessions-updated', sessions)
  }

  /**Danger: This will overwrite all session data. */
  private async overwriteSession(record: Array<PartialBy<Omit<Clients, 'id'>, 'status'>>) {
    this.clientsDb.eraseAll()

    for (const client of record) {
      this.clientsDb.upsertClient(client)
    }
    const session = this.listSessions()
    this.emit('whatsapp:sessions-updated', session)
  }

  private async removeClients(id: string) {
    this.clientsDb.delete(id)
    const sessions = this.listSessions()

    this.emit('whatsapp:sessions-updated', sessions)
  }

  // Called on app start to reconnect any previously authenticated sessions
  async restoreSessions() {
    await this.ready
    const sessions = this.listSessions()
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
    const sessions = this.listSessions()

    const synced = await getSynced(tokensPath, sessions)

    if (synced === 'no-tokens') {
      await FolderHandler.excludeFolder(tokensPath)
      this.clientsDb.eraseAll()
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

    if (this.cancelledSessions.has(id)) {
      this.cancelledSessions.delete(id)
      return // usuário já cancelou antes de sequer começar essa tentativa
    }

    this.startingLocks.add(id)
    let client: Whatsapp | undefined

    try {
      client = await create({
        session: id,
        folderNameToken: this.folderNameToken,
        autoClose: 60000,
        catchQR: (base64Qr) => {
          this.emit('whatsapp:qr', { sessionId: id, qr: base64Qr })
          this.emit('whatsapp:qr-status', { sessionId: id, status: 'pending' })
        },
        statusFind: (status) => {
          this.emit('whatsapp:status', { sessionId: id, status })

          if (status === 'qrReadSuccess') {
            this.emit('whatsapp:qr-status', { sessionId: id, status: 'reading' })
          }
        },
        puppeteerOptions: {
          executablePath: resolveChromeExecutablePath(),
          headless: true,
          timeout: 60000, // Aumenta o tempo limite de lançamento para 60s
          userDataDir: `./tokens/${id}`, // Garante a pasta isolada por sessão
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--mute-audio'
          ]
        },
        headless: true,
        logQR: false
      })

      if (this.cancelledSessions.has(id)) {
        this.cancelledSessions.delete(id)
        this.clients.delete(id)
        await client.close().catch(() => {})
        this.startingLocks.delete(id)
        await this.removeClients(id)
        return
      }

      const reallyConnected = await client.isConnected()
      const pid = this.killer.getBrowserPid(client)
      this.clients.set(id, { client, pid })

      if (!reallyConnected) {
        throw new Error('Session was restaured but not connected (token stale)')
      }

      // this.setClientConnected(client)

      const phone = await client.getWid()
      const name = (await client.getProfileName()) || null

      this.saveSession({ id, phone, name, status: 'connected' })
      this.emit('whatsapp:connected', { sessionId: id, phone })

      client.onStateChange((state) => {
        client?.logger.info('O ESTADO MUDOU!!!!: ' + state)
        if (state === 'CONFLICT' || state === 'UNPAIRED') {
          if (this.handledDisconnects.has(id)) return
          this.handledDisconnects.add(id)
          this.emit('whatsapp:qr-status', { sessionId: id, status: 'expired' })
          this.cleanupDeadSession(id).catch((err) => {
            console.error(`Falha ao limpar sessão morta ${id}:`, err)
          })
        }

        if (state === 'CONNECTED') {
          this.saveSession({ id, phone, name, status: 'connected' })
          this.emit('whatsapp:connected', { sessionId: id, phone })
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

      if (this.cancelledSessions.has(id)) {
        this.cancelledSessions.delete(id)
        await this.removeClients(id)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))
      this.startingLocks.delete(id)

      const maxAttempts = 5
      if (attempt >= maxAttempts) {
        this.saveSession({ id, name: null, phone: '', status: 'disconnected' })
        this.emit('whatsapp:qr-status', { sessionId: id, status: 'timeout' })
        return
      }

      // Retry genérico: qualquer erro (timeout de injeção, auto-close, etc.)
      // dá nova chance, não só 'Auto Close Called'
      this.emit('whatsapp:qr-status', { sessionId: id, status: 'expired' })
      await this.startSession(id, attempt + 1)
      return
    }

    this.startingLocks.delete(id)
  }

  private async cleanupDeadSession(id: string) {
    this.startingLocks.delete(id)
    const client = this.clients.get(id)?.client
    if (client) {
      try {
        await client.close()
      } catch {}
      this.clients.delete(id)
    }
    this.handledDisconnects.delete(id)
    await this.removeClients(id)
  }
  async removeSession(id: string) {
    const handle = this.clients.get(id)
    if (!handle) {
      this.cancelledSessions.add(id)
      await this.removeClients(id)
      return
    }
    this.startingLocks.delete(id)

    const { client, pid } = handle
    this.clients.delete(id)

    try {
      const isConnected = await client.isConnected().catch(() => false)
      if (isConnected) {
        await Promise.race([
          client.logout(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 2000))
        ])
      }
    } catch {}

    try {
      await Promise.race([
        client.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout')), 3000))
      ])
    } catch {}

    // fallback garantido — mata a árvore inteira pelo PID real
    if (pid) {
      await this.killer.forceKillPid(pid)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    this.handledDisconnects.delete(id)
    await this.removeClients(id)
    await this.deleteFolderWithRetry(id)
  }

  async destroyAll() {
    console.log('[WhatsAppManager] Encerrando todas as sessões ativas...')

    for (const [id, { client, pid }] of this.clients) {
      this.handledDisconnects.add(id)
      try {
        await Promise.race([
          client.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ])
      } catch {}

      if (pid) await this.killer.forceKillPid(pid)
    }
    this.clients.clear()

    // rede de segurança final: qualquer chrome.exe remanescente ligado à pasta de tokens
    if (process.platform === 'win32') {
      try {
        const command = `wmic process where "name='chrome.exe' and commandline like '%${this.folderNameToken}%'" call terminate`
        await execPromise(command)
      } catch {}
    }
  }

  private async deleteFolderWithRetry(id: string, retries = 5, delay = 1000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await FolderHandler.excludeFolder(resolve(process.cwd(), this.folderNameToken), id)
        return
      } catch (err: any) {
        if (err?.code === 'EPERM' || err?.code === 'EBUSY') {
          if (attempt === retries) {
            return
          }
          await new Promise((res) => setTimeout(res, delay))
        } else {
          // Se a pasta já não existe ou outro erro genérico, encerra a busca
          return
        }
      }
    }
  }
}

async function getSynced(tokensFolder: string, sessions: Clients[]) {
  const tokens = await FolderHandler.readAllFolders(tokensFolder)

  if (tokens.length === 0) return 'no-tokens'

  // const sessions = store.get('sessions', [])
  const tokensIds = new Set(tokens)

  const syncedSessions = sessions.filter((session) => tokensIds.has(session.id))
  const syncedTokens = tokens.filter((token) => sessions.some((session) => session.id === token))

  return {
    sessions: syncedSessions,
    tokens: syncedTokens
  }
}

class Killer {
  getBrowserPid(client: Whatsapp): number | null {
    try {
      const page = (client as any).page
      const browser = page?.browser?.()
      return browser?.process()?.pid ?? null
    } catch {
      return null
    }
  }

  async isPidAlive(pid: number): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execPromise(`tasklist /FI "PID eq ${pid}"`)
        return stdout.includes(String(pid))
      } catch {
        return false
      }
    }
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  async forceKillPid(pid: number, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      if (!(await this.isPidAlive(pid))) return

      try {
        if (process.platform === 'win32') {
          await execPromise(`taskkill /PID ${pid} /T /F`)
        } else {
          process.kill(pid, 'SIGKILL')
        }
      } catch {
        // pode já ter morrido entre o check e o kill — ok
      }

      await new Promise((r) => setTimeout(r, 500))
    }

    if (await this.isPidAlive(pid)) {
      console.error(`[WhatsAppManager] PID ${pid} sobreviveu a ${maxRetries} tentativas de kill.`)
    }
  }
}

function formatPhoneNumber(input: string) {
  if (input === null || input === undefined) {
    throw new Error('ERRPHONE: number is invalid')
  }

  let raw = String(input).trim()
  raw = raw.replace(/@(c|g)\.us$/i, '')

  let digits = raw.replace(/\D/g, '')

  if (!digits) {
    throw new Error('ERRPHONE: number is invalid')
  }

  if (digits.startsWith('0055')) {
    digits = digits.slice(2)
  }

  if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith('55')) {
      throw new Error('ERRPHONE: country code is invalid')
    }
    digits = digits.slice(2)
  } else if (digits.length !== 10 && digits.length !== 11) {
    throw new Error('ERRPHONE: ddd or number is missing')
  }

  const ddd = digits.slice(0, 2)
  let numero = digits.slice(2)

  if (!/^[1-9]\d$/.test(ddd)) {
    throw new Error('ERRPHONE: ddd is invalid')
  }

  if (numero.length < 8 || numero.length > 9) {
    throw new Error('ERRPHONE: number is invalid')
  }

  if (numero.length === 8 && /^[6-9]/.test(numero)) {
    numero = '9' + numero
  }

  return `55${ddd}${numero}@c.us`
}

const FIELD_ALIASES: Record<string, string> = {
  nome: 'name',
  celular: 'phone'
}

export function renderMessageText(message: string, contact: Record<string, unknown>) {
  const regex = /\{\{(.*?)\}\}/g
  const keyMap = new Map(Object.keys(contact).map((k) => [k.toLowerCase(), k]))

  return message.replace(regex, (match, key: string) => {
    const tk = key.trim().toLowerCase()
    const aliased = FIELD_ALIASES[tk] ?? tk
    const realKey = keyMap.get(aliased)
    if (!realKey) return match

    const value = contact[realKey]
    return value !== undefined ? String(value) : match
  })
}
