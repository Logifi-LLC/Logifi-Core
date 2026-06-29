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
  | 'tail_match'
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

/** Persisted on digifi_scan_sessions.scan_payload for spread recovery. */
export interface DigifiScanSessionPayload {
  pageSide: DigifiPageSide
  rows: DigifiScanRow[]
  filledCellCount: number
  reviewMessages?: string[]
  reviewRequiredCount?: number
  rowsReturned: number
  distinctRowIndices: number[]
  missingRowIndices: number[]
  duplicateRowIndices: number[]
  emptyRowIndices: number[]
  hasGaps: boolean
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
  baseRow?: number
  allowedColumnIds?: string[]
}

export interface DigifiSpreadRecoveryPage {
  scanId: string
  pageSide: DigifiPageSide
  rows: DigifiScanRow[]
  filledCellCount: number
  reviewMessages?: string[]
  reviewRequiredCount?: number
  rowsReturned: number
  distinctRowIndices: number[]
  missingRowIndices: number[]
  duplicateRowIndices: number[]
  emptyRowIndices: number[]
  hasGaps: boolean
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
  baseRow?: number
  allowedColumnIds?: string[]
}

export interface DigifiSpreadRecoveryResponse {
  spreadId: string
  pages: DigifiSpreadRecoveryPage[]
}

export interface DigifiScanResponse {
  ok: true
  scanId: string
  credits?: number
  creditCharged?: boolean
  rows: DigifiScanRow[]
  filledCellCount: number
  modelUsed: string
  providerUsed?: 'gemini' | 'anthropic'
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
  fallbackUsed?: boolean
  modelsAttempted?: string[]
  /** Vision API HTTP requests for this page (1 expected with default settings). */
  apiCallCount?: number
  /** @deprecated Use apiCallCount */
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
  /** Summary/totals rows removed by server sanitizer before grid fill. */
  strippedRowIndices?: number[]
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

export interface DigifiCaptureSessionListItem {
  sessionId: string
  token: string
  expiresAt: string
  createdAt: string
  photoCount: number
}

export function parseDigifiCaptureTokenFromUrl(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  if (/^[A-Za-z0-9_-]{16,}$/.test(value)) return value

  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    if (parts[parts.length - 2] !== 'digifi-capture') return null
    const token = parts[parts.length - 1] ?? ''
    return /^[A-Za-z0-9_-]{16,}$/.test(token) ? token : null
  } catch {
    return null
  }
}
