import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  whatsapp: {
    listSessions: () => ipcRenderer.invoke('whatsapp:list-sessions'),
    addSession: () => ipcRenderer.invoke('whatsapp:add-session'),
    removeSession: (id: string) => ipcRenderer.invoke('whatsapp:remove-session', id),
    onConnected: (callback: (data: { sessionId: string; number: string | null }) => void) => {
      const listener = (_: unknown, data: any) => callback(data)
      ipcRenderer.on('whatsapp:connected', listener)
      console.log('whatsapp:connected')
      return () => ipcRenderer.removeListener('whatsapp:connected', listener)
    },
    onQr: (callback: (data: { sessionId: string; qr: string }) => void) => {
      const listener = (_: unknown, data: any) => callback(data)
      ipcRenderer.on('whatsapp:qr', listener)
      return () => ipcRenderer.removeListener('whatsapp:qr', listener)
    },
    onStatus: (callback: (data: { sessionId: string; status: string }) => void) => {
      const listener = (_: unknown, data: any) => callback(data)
      ipcRenderer.on('whatsapp:status', listener)
      return () => ipcRenderer.removeListener('whatsapp:status', listener)
    },
    onSessionsUpdated: (callback: (sessions: any[]) => void) => {
      const listener = (_: unknown, data: any) => callback(data)
      ipcRenderer.on('whatsapp:sessions-updated', listener)
      return () => ipcRenderer.removeListener('whatsapp:sessions-updated', listener)
    }
  }
}

export type RendererApi = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
