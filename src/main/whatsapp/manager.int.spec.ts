import { renderMessageText } from './manager'
/* import { join } from 'path'
import { FolderHandler } from '../folder/handler'
// import {} from ""
import Store from 'electron-store'
import { existsSync } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { WhatsAppManager } from './manager'

interface SessionRecord {
  id: string
  number: string | null
  status: 'connecting' | 'connected' | 'disconnected'
}

const tokensFolder = join(process.cwd(), 'test-tokens')
const store = new Store<{ sessions: SessionRecord[] }>({
  name: 'test',
  cwd: 'C:\\Users\\caiop\\AppData\\Roaming\\WhatsBot'
})

store.set('sessions', [
  {
    id: 'db0770e4-8631-423d-ac29-0ae4282b5825',
    number: null,
    status: 'connected'
  },
  {
    id: '634bb796-7179-4b0b-8695-059444b693d2',
    number: null,
    status: 'connected'
  },
  {
    id: 'invalid-sessionses',
    number: null,
    status: 'connected'
  }
])

async function getSynced() {
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

async function doEmptyTokensWithSession() {
  if (existsSync(tokensFolder)) {
    await rm(tokensFolder, { recursive: true, force: true })
  }
  store.set('sessions', [{ id: 'invalid-session__', number: null, status: 'connecting' }])
}

async function doEmptySessionWithToken() {
  const path = join(tokensFolder, 'invalid-token-example')

  await mkdir(path, { recursive: true })
  store.set('sessions', [])

  return path
}

async function doUnsycedWithAtLeastOneSynced() {
  const invalid = join(tokensFolder, 'invalid-token-example')
  const valid = join(tokensFolder, 'valid-token')
  const connecting = join(tokensFolder, 'valid-token-connecting')

  await mkdir(valid, { recursive: true })
  await mkdir(invalid, { recursive: true })
  await mkdir(connecting, { recursive: true })

  store.set('sessions', [
    {
      id: 'invalid',
      phone: null,
      status: 'disconnected'
    },
    {
      id: 'valid-token',
      phone: null,
      status: 'connected'
    },
    {
      id: 'valid-token-connecting',
      phone: null,
      status: 'connecting'
    }
  ])
  return valid
}

describe('WhatsappManager', () => {
  it('should keep synced when empty folder', async () => {
    await doEmptyTokensWithSession()
    const wpp = new WhatsAppManager({ store: store as any, folderNameToken: 'test-tokens' })
    await wpp.waitUntilReady()

    const synced = await getSynced()
    const sessions = wpp.listSessions()

    expect(synced).toBe('no-tokens')
    expect(sessions).toHaveLength(0)
    expect(existsSync(tokensFolder)).toBe(false)
  })

  it('should keep synced when have no session but have token', async () => {
    const path = await doEmptySessionWithToken()
    const wpp = new WhatsAppManager({ store: store as any, folderNameToken: 'test-tokens' })
    await wpp.waitUntilReady()

    const sessions = wpp.listSessions()

    expect(sessions).toHaveLength(0)
    expect(existsSync(path)).toBe(false)
  })
  it('should keep synced', async () => {
    const path = await doUnsycedWithAtLeastOneSynced()
    const wpp = new WhatsAppManager({ store: store as any, folderNameToken: 'test-tokens' })
    await wpp.waitUntilReady()

    const sessions = wpp.listSessions()

    expect(sessions).toHaveLength(2)
    expect(await FolderHandler.readAllFolders(tokensFolder)).toHaveLength(2)
    expect(existsSync(path)).toBe(true)

    expect(sessions[0].id).toBe('valid-token')
  })
})
 */

describe('WhatsAppManager', () => {
  it('should fullfil variables in text', () => {
    const res = renderMessageText('Olá {{Nome}}, tudo bem? {{Dia}}', {
      name: 'Caio',
      phone: '2199999',
      Dia: 'Teste'
    })

    console.log(res)
  })
})
