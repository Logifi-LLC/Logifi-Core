import type {
  DigifiScanSessionPayload,
  DigifiSpreadRecoveryPage,
  DigifiSpreadRecoveryResponse,
} from '../../app/utils/digifiTypes'
import { isValidSpreadId } from './digifiScanPayload'

interface DigifiScanSessionRow {
  id: string
  spread_id: string | null
  scan_payload: DigifiScanSessionPayload | null
  created_at: string
}

export function parseDigifiScanSessionPayload(
  value: unknown
): DigifiScanSessionPayload | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as DigifiScanSessionPayload
  if (!Array.isArray(payload.rows) || !payload.pageSide) return null
  return payload
}

export function mapSessionsToSpreadRecovery(
  spreadId: string,
  sessions: DigifiScanSessionRow[]
): DigifiSpreadRecoveryResponse {
  const pages: DigifiSpreadRecoveryPage[] = []

  for (const session of sessions) {
    const payload = parseDigifiScanSessionPayload(session.scan_payload)
    if (!payload) continue

    pages.push({
      scanId: session.id,
      pageSide: payload.pageSide,
      rows: payload.rows,
      filledCellCount: payload.filledCellCount,
      reviewMessages: payload.reviewMessages,
      reviewRequiredCount: payload.reviewRequiredCount,
      rowsReturned: payload.rowsReturned,
      distinctRowIndices: payload.distinctRowIndices,
      missingRowIndices: payload.missingRowIndices,
      duplicateRowIndices: payload.duplicateRowIndices,
      emptyRowIndices: payload.emptyRowIndices,
      hasGaps: payload.hasGaps,
      strategyUsed: payload.strategyUsed,
      chunkCount: payload.chunkCount,
      rescueAttempted: payload.rescueAttempted,
      rescueRecoveredCount: payload.rescueRecoveredCount,
      baseRow: payload.baseRow,
      allowedColumnIds: payload.allowedColumnIds,
    })
  }

  return { spreadId, pages }
}

export function validateSpreadIdParam(spreadId: string | undefined): string {
  if (!spreadId || !isValidSpreadId(spreadId)) {
    throw new Error('Invalid spread id')
  }
  return spreadId
}
