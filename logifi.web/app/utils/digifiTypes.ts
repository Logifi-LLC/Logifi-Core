import type { BuilderLayout } from './logbookBuilderTypes'
import type { LogbookColumnKey } from './logbookTypes'

export type DigifiPageSide = 'left' | 'right'
export type DigifiScanStrategy = 'page-overview' | 'page-overview+row-bands'
export type DigifiPersonalizationStrategy =
  | 'raw'
  | 'known_exact'
  | 'feedback_exact'
  | 'history_clear_winner'
  | 'feedback_clear_winner'
  | 'ambiguous'
export type DigifiPersonalizationConfidence = 'low' | 'medium' | 'high'

/** Column snapshot sent to the scan API (matches builder grid). */
export interface DigifiTemplateColumn {
  id: string
  label: string
  fieldKey: LogbookColumnKey | null
  order: number
  categoryClassValue?: string
}

export interface DigifiScanChunkMeta {
  partName: string
  rowStart: number
  rowEnd: number
}

/** Client request metadata (multipart field `meta`). */
export interface DigifiScanMeta {
  spreadId: string
  pageSide: DigifiPageSide
  layout: BuilderLayout
  rowCount: number
  twoPageSplitIndex: number
  defaultYear: number | null
  templateName?: string
  columns: DigifiTemplateColumn[]
  chunkedScan?: {
    strategy: Extract<DigifiScanStrategy, 'page-overview+row-bands'>
    chunkSize: number
    overlapRows: number
    chunks: DigifiScanChunkMeta[]
  }
}

export interface DigifiScanCellCandidate {
  value: string
  score: number
  distance?: number
  source: 'history' | 'catalog' | 'feedback'
  aircraftMakeModel?: string | null
  aircraftCategoryClass?: string | null
  sampleCount?: number
}

export interface DigifiScanCellMeta {
  fieldKey: LogbookColumnKey | null
  rawValue: string
  resolvedValue: string
  strategy: DigifiPersonalizationStrategy
  confidence: DigifiPersonalizationConfidence
  autoApplied: boolean
  needsReview: boolean
  userConfirmed?: boolean
  message?: string
  contextKey?: string
  candidates?: DigifiScanCellCandidate[]
}

/** One extracted row from the vision model. */
export interface DigifiScanRow {
  rowIndex: number
  cells: Record<string, string>
  tags?: string[]
  cellMeta?: Record<string, DigifiScanCellMeta>
}

export interface DigifiScanResponse {
  ok: true
  scanId: string
  credits?: number
  creditCharged?: boolean
  rows: DigifiScanRow[]
  filledCellCount: number
  modelUsed: string
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
  fallbackUsed?: boolean
  modelsAttempted?: string[]
  /** generateContent HTTP requests for this page (1 expected with default settings). */
  geminiApiCallCount?: number
  scanTimings?: {
    primaryMs: number
    rescueMs: number
    totalMs: number
    totalRequestMs: number
    geminiMs: number
    normalizeMs: number
    personalizationMs: number
  }
  rowsReturned: number
  distinctRowIndices: number[]
  missingRowIndices: number[]
  duplicateRowIndices: number[]
  emptyRowIndices: number[]
  hasGaps: boolean
  reviewMessages?: string[]
  reviewRequiredCount?: number
}

export interface DigifiCaptureSessionResponse {
  ok: true
  sessionId: string
  token: string
  expiresAt: string
  /** Phone-reachable URL (LAN IP when dev server is bound to 0.0.0.0). */
  mobileUrl: string
}

export interface DigifiCapturePhoto {
  id: string
  mimeType: string
  byteSize: number
  createdAt: string
  signedUrl: string | null
  pageSide: DigifiPageSide | null
}
