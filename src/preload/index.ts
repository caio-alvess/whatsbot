import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Contact } from '../main/whatsapp/manager'

// Custom APIs for renderer
const api = {
  whatsapp: {
    sendText: (payload: { sessionId: string; text: string; contact: Contact }) =>
      ipcRenderer.invoke('whatsapp:send-text', payload),
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
    onQrStatus: (
      callback: (data: {
        sessionId: string
        status: 'pending' | 'expired' | 'timeout' | 'reading'
      }) => void
    ) => {
      const listener = (_: unknown, data: any) => callback(data)
      ipcRenderer.on('whatsapp:qr-status', listener)
      return () => ipcRenderer.removeListener('whatsapp:qr-status', listener)
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
  },
  // sender: {
  //   restorePendings: (clientsPhones: string[]): Promise<InitialProgress[]> =>
  //     ipcRenderer.invoke('sender:restore', clientsPhones),

  //   discardPendigns: (clientsPhones: string[]): Promise<void> =>
  //     ipcRenderer.invoke('sender:discard-pendings', clientsPhones),

  //   create: (data: {
  //     clientsPhones: string[]
  //     contacts: { name: string; phone: string }[]
  //   }): Promise<InitialProgress[]> => ipcRenderer.invoke('sender:create', data),

  //   start: (data: { text: string; clientsPhones: string[] }) =>
  //     ipcRenderer.invoke('sender:start', data),

  //   onStatus: (callback: (data: { sessionId: string; status: Status }) => void) => {
  //     const listener = (_: unknown, data: any) => callback(data)
  //     ipcRenderer.on('sender:status', listener)
  //     return () => ipcRenderer.removeListener('sender:status', listener)
  //   },

  //   onProgress: (
  //     callback: (data: {
  //       clientId: string
  //       status: {
  //         success: number
  //         failure: number
  //         total: number
  //       }
  //     }) => void
  //   ) => {
  //     const listener = (_: unknown, data: any) => callback(data)
  //     ipcRenderer.on('sender:progress', listener)
  //     return () => ipcRenderer.removeListener('sender:progress', listener)
  //   }
  // },
  sheet: {
    preview: (file: { name: string; size: number; buf: ArrayBuffer }) =>
      ipcRenderer.invoke('sheet:preview', file),

    sheetToJSON<T = unknown>(file: ArrayBuffer) {
      return ipcRenderer.invoke('sheet:to-json', file) as Promise<{
        status: 'success' | 'error'
        data: T[] | []
      }>
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
