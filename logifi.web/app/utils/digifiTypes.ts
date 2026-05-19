import type { BuilderLayout } from './logbookBuilderTypes'
import type { LogbookColumnKey } from './logbookTypes'

export type DigifiPageSide = 'left' | 'right'

/** Column snapshot sent to the scan API (matches builder grid). */
export interface DigifiTemplateColumn {
  id: string
  label: string
  fieldKey: LogbookColumnKey | null
  order: number
  categoryClassValue?: string
}

/** Client request metadata (multipart field `meta`). */
export interface DigifiScanMeta {
  pageSide: DigifiPageSide
  layout: BuilderLayout
  rowCount: number
  twoPageSplitIndex: number
  defaultYear: number | null
  templateName?: string
  columns: DigifiTemplateColumn[]
  useProModel?: boolean
}

/** One extracted row from the vision model. */
export interface DigifiScanRow {
  rowIndex: number
  cells: Record<string, string>
  tags?: string[]
}

export interface DigifiScanResponse {
  ok: true
  scanId: string
  rows: DigifiScanRow[]
  filledCellCount: number
  modelUsed: string
}
