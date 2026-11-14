import { isCapacitorNative } from '../composables/useCapacitorPlatform'

export interface ClientFileSave {
  filename: string
  mimeType: string
  data: BlobPart
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Save a generated file. Web uses the same Blob + `<a download>` path as CSV/JSON.
 * iOS Capacitor tries the Web Share sheet with a File, then falls back to that download.
 */
export async function saveClientFile(file: ClientFileSave): Promise<void> {
  if (typeof document === 'undefined') return

  const blob = new Blob([file.data], { type: file.mimeType })

  if (isCapacitorNative() && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const shared = new File([blob], file.filename, { type: file.mimeType })
      const payload: ShareData = { files: [shared], title: file.filename }
      const canShare =
        typeof navigator.canShare !== 'function' || navigator.canShare(payload)
      if (canShare) {
        await navigator.share(payload)
        return
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
    }
  }

  triggerAnchorDownload(blob, file.filename)
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  triggerAnchorDownload(blob, filename)
}
