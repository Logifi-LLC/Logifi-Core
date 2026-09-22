import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { pageHasScanData } from '~/composables/useDigifiSpreadRecovery'
import type { BuilderLayout } from '~/utils/logbookBuilderTypes'
import type { DigifiPageSide } from '~/utils/digifiTypes'

type CaptureGrid = Pick<
  ReturnType<typeof useLogbookBuilderGrid>,
  'layout' | 'leftPageScanned' | 'digifiScanStatusByPage' | 'rows' | 'visibleColumns' | 'effectiveSplitIndex'
>

export type MobileCaptureSession = {
  leftPhotoCaptured: boolean
  rightPhotoCaptured: boolean
}

/** True when this spread side already has a photo or applied scan — do not re-prompt capture. */
export function isMobileCaptureSideComplete(
  grid: CaptureGrid,
  pageSide: DigifiPageSide,
  photoCapturedThisSession: boolean
): boolean {
  if (photoCapturedThisSession) return true
  if (pageSide === 'left' && grid.leftPageScanned.value) return true
  if (pageSide === 'right' && grid.digifiScanStatusByPage.value.right) return true
  return pageHasScanData(grid as ReturnType<typeof useLogbookBuilderGrid>, pageSide)
}

/** Next page to photograph for two-page spreads; null when both sides are already captured. */
export function nextMobileCaptureSide(
  layout: BuilderLayout,
  grid: CaptureGrid,
  session: MobileCaptureSession
): DigifiPageSide | null {
  if (layout !== 'two-page') return 'left'
  if (!isMobileCaptureSideComplete(grid, 'left', session.leftPhotoCaptured)) return 'left'
  if (!isMobileCaptureSideComplete(grid, 'right', session.rightPhotoCaptured)) return 'right'
  return null
}

export function mobileCaptureLabel(side: DigifiPageSide | null, layout: BuilderLayout): string {
  if (layout === 'two-page' && side === 'right') return 'Photograph right page'
  if (layout === 'two-page') return 'Photograph left page'
  return 'Photograph page'
}

export function mobileTwoPageCaptureStep(side: DigifiPageSide | null): 1 | 2 | null {
  if (side === 'left') return 1
  if (side === 'right') return 2
  return null
}
