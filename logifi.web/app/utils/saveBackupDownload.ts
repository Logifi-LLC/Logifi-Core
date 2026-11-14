/** Save or share a download (web anchor, iOS/Android Web Share with files when available). */
export async function saveBackupDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  if (typeof document === 'undefined') return 'downloaded'

  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: 'Logifi export' })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'shared'
      }
    }
  }

  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return 'downloaded'
}