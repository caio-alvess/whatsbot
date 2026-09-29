import { useCallback } from 'react'

export function useSheet() {
  const startPreview = useCallback(
    async (file: { name: string; size: number; buf: ArrayBuffer }) => {
      return await window.api.sheet.preview(file)
    },
    []
  )

  const sheetToJson = useCallback(async (file: ArrayBuffer) => {
    return await window.api.sheet.sheetToJSON(file)
  }, [])

  return { startPreview, sheetToJson }
}
