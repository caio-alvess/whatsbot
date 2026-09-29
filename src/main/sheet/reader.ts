import * as XLSX from 'xlsx'

interface PreviewResponse {
  fileName: string
  fileSize: number
  columns: string[]
  rows: Record<string, unknown>[]
}

export class SheetReader {
  static async preview({
    name,
    size,
    buf
  }: {
    name: string
    size: number
    buf: ArrayBuffer
  }): Promise<PreviewResponse | null> {
    try {
      const workbook = XLSX.read(buf, { type: 'array' })

      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) return null

      const worksheet = workbook.Sheets[firstSheetName]
      if (!worksheet) return null

      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: ''
      })
      if (json.length === 0) return null

      const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
        header: 1,
        blankrows: false
      })
      const columns =
        headerRows[0]?.map((c) => String(c).trim()).filter(Boolean) ?? Object.keys(json[0] ?? {})

      return {
        fileName: name,
        fileSize: size,
        columns,
        rows: json
      }
    } catch (error) {
      console.error(error)
      return null
    }
  }

  static toJSON<T>(sheet: ArrayBuffer): { status: 'success' | 'error'; data: T[] | [] } {
    try {
      const workbook = XLSX.read(sheet)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

      const updatedData = data.map((row) => {
        const newRow: Record<string, any> = {}

        for (const key in row) {
          if (key === 'Nome') {
            newRow['name'] = row[key]
          } else if (key === 'Celular') {
            newRow['phone'] = row[key]
          } else {
            newRow[key] = row[key]
          }
        }

        return newRow
      })

      return { status: 'success', data: updatedData as any[] }
    } catch (error) {
      console.error(error)
      return { status: 'error', data: [] }
    }
  }
}
