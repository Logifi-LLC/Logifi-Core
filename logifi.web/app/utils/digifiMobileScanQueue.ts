import type { BuilderLayout } from '~/utils/logbookBuilderTypes'
import type { DigifiPageSide } from '~/utils/digifiTypes'

export interface PendingMobileScan {
  pageSide: DigifiPageSide
  file: File
}

/** Pick the next scan job — left always before right; right waits until left scan applied. */
export function pickNextPendingMobileScan(
  pending: PendingMobileScan[],
  layout: BuilderLayout,
  leftPageScanned: boolean
): PendingMobileScan | null {
  const left = pending.find((item) => item.pageSide === 'left')
  if (left) return left
  const right = pending.find((item) => item.pageSide === 'right')
  if (!right) return null
  if (layout === 'two-page' && !leftPageScanned) return null
  return right
}

export function upsertPendingMobileScan(
  pending: PendingMobileScan[],
  pageSide: DigifiPageSide,
  file: File
): PendingMobileScan[] {
  const withoutSide = pending.filter((item) => item.pageSide !== pageSide)
  return [...withoutSide, { pageSide, file }]
}
