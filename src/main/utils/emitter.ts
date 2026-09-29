import type { BrowserWindow } from 'electron'

export class Emitter {
  private window: BrowserWindow

  constructor(window: BrowserWindow) {
    this.window = window
  }

  emit(channel: string, payload: unknown = {}) {
    this.window?.webContents.send(channel, payload)
  }
}
