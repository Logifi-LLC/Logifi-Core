import type { ExportResult } from '../../shared/logbookDataBridge/types'
import { triggerBlobDownload } from './clientFileSave'

/** Trigger a browser download for an export result. No-op outside the browser. */
export function downloadExport(result: ExportResult): void {
  if (typeof document === 'undefined') return

  const content =
    result.bom && !result.content.startsWith('\uFEFF')
      ? `\uFEFF${result.content}`
      : result.content

  const blob = new Blob([content], { type: result.mimeType })
  triggerBlobDownload(blob, result.filename)
}
