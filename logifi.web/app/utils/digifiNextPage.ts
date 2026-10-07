import type { BuilderColumnKind, BuilderLayout } from './logbookBuilderTypes'
import type { LogbookColumnKey } from './logbookTypes'

export interface DigifiNextPageColumn {
  id: string
  label: string
  fieldKey: LogbookColumnKey | null
  order: number
  width?: number
  categoryClassValue?: string
  /** Day time and custom paper columns are part of the column template. */
  columnKind?: BuilderColumnKind
}

/** Settings that stay put when the next logbook page is scanned. */
export interface DigifiNextPageSettings {
  columns: DigifiNextPageColumn[]
  layout: BuilderLayout
  defaultYear: number | null
  twoPageSplitIndex: number
  rowCount: number
}

export type DigifiCaptureMethod = 'qr' | 'camera' | 'file'

export interface DigifiNextCapturePlan {
  /** Keep the paired phone session. Do not mint a new QR code. */
  reuseQrSession: boolean
  /** Open the in-app camera (Eye) for the next page. */
  openCamera: boolean
  /** Companion session exists but is past its TTL. */
  qrExpired: boolean
}

export function planDigifiNextCapture(input: {
  method: DigifiCaptureMethod
  qrSessionActive: boolean
}): DigifiNextCapturePlan {
  if (input.method === 'camera') {
    return { reuseQrSession: false, openCamera: true, qrExpired: false }
  }
  if (input.method === 'qr') {
    return {
      reuseQrSession: input.qrSessionActive,
      openCamera: false,
      qrExpired: !input.qrSessionActive,
    }
  }
  return { reuseQrSession: false, openCamera: false, qrExpired: false }
}

/**
 * Copy the locked builder year as-is. A date on the imported page that
 * resolved into the next calendar year must not become the next page's year.
 */
export function nextDigifiPageSettings(current: DigifiNextPageSettings): DigifiNextPageSettings {
  return {
    columns: current.columns.map((column) => ({ ...column })),
    layout: current.layout,
    defaultYear: current.defaultYear,
    twoPageSplitIndex: current.twoPageSplitIndex,
    rowCount: current.rowCount,
  }
}

export function digifiImportSucceeded(result: {
  imported: number
  errors: readonly unknown[]
}): boolean {
  return result.imported > 0 && result.errors.length === 0
}
