import type { LogbookColumnKey } from '~/utils/logbookTypes'

const BASE_ROW_PX = 28
const REMARKS_ROW_PX = 44
const REMARKS_LINE_PX = 18
const RESCAN_BUTTON_PX = 34

type ReviewColumn = { id: string; fieldKey: LogbookColumnKey | null }
type ReviewRow = {
  cells?: Record<string, string>
  digifiCellMeta?: Record<string, { needsReview?: boolean }>
}

export type DigifiMobileReviewRowLayoutInput = {
  rowCount: number
  rows: ReviewRow[]
  columns: ReviewColumn[]
  remarksRescanRowIndices?: ReadonlySet<number>
}

function remarksLineCount(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  const segments = trimmed.split(/\s*\|\s*|\r?\n/)
  return segments.filter((s) => s.length > 0).length
}

function rowNeedsRemarksRescanSpace(
  rowIdx: number,
  remarksColId: string | undefined,
  row: ReviewRow | undefined,
  remarksRescanRowIndices?: ReadonlySet<number>
): boolean {
  if (!remarksColId || !row) return false
  if (remarksRescanRowIndices?.has(rowIdx)) return true
  return row.digifiCellMeta?.[remarksColId]?.needsReview === true
}

/** Merge per-row measurements (e.g. from layout) with a floor per index. */
export function mergeDigifiMobileReviewRowHeights(
  rowCount: number,
  measured: readonly number[],
  floorHeights?: readonly number[]
): number[] {
  const heights: number[] = []
  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const floor = floorHeights?.[rowIdx] ?? BASE_ROW_PX
    const fromLayout = measured[rowIdx] ?? 0
    heights.push(Math.max(floor, fromLayout))
  }
  return heights
}

/** Heuristic min-heights before layout measure (remarks line count). */
export function computeDigifiMobileReviewRowMinHeights(
  input: DigifiMobileReviewRowLayoutInput
): number[] {
  const remarksCol = input.columns.find((c) => c.fieldKey === 'remarks')
  const heights: number[] = []

  for (let rowIdx = 0; rowIdx < input.rowCount; rowIdx++) {
    let height = BASE_ROW_PX
    const row = input.rows[rowIdx]

    if (remarksCol) {
      const text = (row?.cells?.[remarksCol.id] ?? '').trim()
      const lines = remarksLineCount(text)
      if (lines > 0) {
        const remarksHeight = REMARKS_ROW_PX + Math.max(0, lines - 2) * REMARKS_LINE_PX
        height = Math.max(height, remarksHeight)
      }
    }

    if (
      rowNeedsRemarksRescanSpace(
        rowIdx,
        remarksCol?.id,
        row,
        input.remarksRescanRowIndices
      )
    ) {
      height += RESCAN_BUTTON_PX
    }

    heights.push(height)
  }

  return heights
}
