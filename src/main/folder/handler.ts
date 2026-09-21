import { existsSync } from 'fs'
import { readdir, rm } from 'fs/promises'
import { resolve } from 'path'

export class FolderHandler {
  static async excludeFolder(destPath: string, folder?: string) {
    await rm(resolve(destPath, folder || ''), {
      recursive: true,
      force: true
    })
  }

  static async readAllFolders(destPath: string) {
    if (!existsSync(destPath)) return []
    return await readdir(destPath)
  }

  static checkFolderExistence(destPath: string, folderName: string) {
    return existsSync(resolve(destPath, folderName))
  }
}
