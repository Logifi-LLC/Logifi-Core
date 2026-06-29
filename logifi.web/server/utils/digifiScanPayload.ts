import type {
  DigifiPageSide,
  DigifiScanRow,
  DigifiScanSessionPayload,
  DigifiScanStrategy,
} from '../../app/utils/digifiTypes'

export interface BuildDigifiScanSessionPayloadInput {
  pageSide: DigifiPageSide
  rows: DigifiScanRow[]
  filledCellCount: number
  reviewMessages: string[]
  reviewRequiredCount: number
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
}

export function buildDigifiScanSessionPayload(
  input: BuildDigifiScanSessionPayloadInput
): DigifiScanSessionPayload {
  return {
    pageSide: input.pageSide,
    rows: input.rows,
    filledCellCount: input.filledCellCount,
    reviewMessages: input.reviewMessages,
    reviewRequiredCount: input.reviewRequiredCount,
    rowsReturned: input.rowsReturned,
    distinctRowIndices: input.distinctRowIndices,
    missingRowIndices: input.missingRowIndices,
    duplicateRowIndices: input.duplicateRowIndices,
    emptyRowIndices: input.emptyRowIndices,
    hasGaps: input.hasGaps,
    strategyUsed: input.strategyUsed,
    chunkCount: input.chunkCount,
    rescueAttempted: input.rescueAttempted,
    rescueRecoveredCount: input.rescueRecoveredCount,
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidSpreadId(spreadId: string): boolean {
  return UUID_RE.test(spreadId)
}
