import type { DigifiScanRow } from '../../app/utils/digifiTypes'
import { parseDigifiTsvResponse } from './digifiTsvParser'

export function parseExtractResponse(
  text: string,
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows?: Set<number>
): DigifiScanRow[] {
  return parseDigifiTsvResponse(text, allowedColumnIds, maxRowCount, focusRows)
}
