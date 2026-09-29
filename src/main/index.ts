import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import { Contact, WhatsAppManager } from './whatsapp/manager'
import { SheetReader } from './sheet/reader'
import { AppDatabase } from './db/database'
import { ClientsDatabase } from './db/tables/client.db'
import { Emitter } from './utils/emitter'

let db: AppDatabase
let emitter: Emitter
let clientsDb: ClientsDatabase
let whatsappManager: WhatsAppManager
let currentWindow: BrowserWindow | null = null

// const user = new User(new Store())

async function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 500,
    minWidth: 400,
    maxWidth: 700,
    minHeight: 700,
    maxHeight: 900,
    height: 770,
    icon,
    title: 'Whatsbot',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  currentWindow = mainWindow
  mainWindow.on('closed', () => {
    currentWindow = null
  })

  //whatsapp handlers
  emitter = new Emitter(mainWindow)
  whatsappManager.setEmitter(emitter)
  await whatsappManager.waitUntilReady()

  ipcMain.handle(
    'whatsapp:send-text',
    (_event, payload: { sessionId: string; text: string; contact: Contact }) => {
      return whatsappManager.sendText(payload)
    }
  )

  ipcMain.handle('whatsapp:list-sessions', () => {
    return whatsappManager.listSessions()
  })
  ipcMain.handle('whatsapp:add-session', async () => {
    return whatsappManager.addSession()
  })
  ipcMain.handle('whatsapp:remove-session', async (_event, id: string) => {
    return whatsappManager.removeSession(id)
  })
  whatsappManager.restoreSessions().catch((err) => {
    console.error('Failed to restore WhatsApp sessions:', err)
  })

  // sheet handlers
  ipcMain.handle('sheet:to-json', async (_event, file: ArrayBuffer) => {
    return SheetReader.toJSON(file)
  })

  ipcMain.handle(
    'sheet:preview',
    async (
      _event,
      file: {
        name: string
        size: number
        buf: ArrayBuffer
      }
    ) => {
      return SheetReader.preview(file)
    }
  )

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'bottom' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running. Quit before any init happens.
  app.quit()
} else {
  app.on('second-instance', () => {
    if (currentWindow) {
      if (currentWindow.isMinimized()) currentWindow.restore()
      if (!currentWindow.isVisible()) currentWindow.show()
      currentWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    db = new AppDatabase(app.getPath('userData'))
    clientsDb = new ClientsDatabase(db)
    whatsappManager = new WhatsAppManager({ clientsDb: clientsDb })
    await createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  let isCleaningUp = false

  app.on('before-quit', async (e) => {
    if (isCleaningUp) return
    e.preventDefault()
    isCleaningUp = true

    console.log('App fechando. Iniciando limpeza de processos do Puppeteer...')

    try {
      await Promise.race([
        whatsappManager.destroyAll(),
        new Promise((resolve) => setTimeout(resolve, 5000))
      ])
    } catch (err) {
      console.error('Erro durante a limpeza de sessões:', err)
    } finally {
      app.quit()
    }
  })
}
