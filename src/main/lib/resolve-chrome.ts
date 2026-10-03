import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export function resolveChromeExecutablePath(): string {
  const chromeCacheRoot = app.isPackaged
    ? join(process.resourcesPath, 'chrome-cache')
    : join(process.cwd(), 'resources', 'chrome-cache')

  const chromeDir = join(chromeCacheRoot, 'chrome')

  if (!existsSync(chromeDir)) {
    throw new Error(`Pasta do Chrome não encontrada: ${chromeDir}`)
  }

  const versionFolders = readdirSync(chromeDir)
  if (versionFolders.length === 0) {
    throw new Error(`Nenhuma versão do Chrome instalada em ${chromeDir}`)
  }

  const versionFolder = versionFolders[0]
  const execPath = join(chromeDir, versionFolder, 'chrome-win64', 'chrome.exe')

  if (!existsSync(execPath)) {
    throw new Error(`chrome.exe não encontrado em ${execPath}`)
  }

  return execPath
}
