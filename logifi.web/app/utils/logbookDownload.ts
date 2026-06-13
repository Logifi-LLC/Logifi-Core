import type { ExportResult } from '../../shared/logbookDataBridge/types'

/** Trigger a browser download for an export result. No-op outside the browser. */
export function downloadExport(result: ExportResult): void {
  if (typeof document === 'undefined') return

  const content =
    result.bom && !result.content.startsWith('\uFEFF')
      ? `\uFEFF${result.content}`
      : result.content

  const blob = new Blob([content], { type: result.mimeType })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', result.filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
