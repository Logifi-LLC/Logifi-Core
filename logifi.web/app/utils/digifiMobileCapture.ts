import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { pageHasScanData } from '~/composables/useDigifiSpreadRecovery'
import type { BuilderLayout } from '~/utils/logbookBuilderTypes'
import type { DigifiPageSide } from '~/utils/digifiTypes'

type CaptureGrid = Pick<
  ReturnType<typeof useLogbookBuilderGrid>,
  'layout' | 'leftPageScanned' | 'digifiScanStatusByPage' | 'rows' | 'visibleColumns' | 'effectiveSplitIndex'
>

export function isTwoPageSpreadFullyCaptured(grid: CaptureGrid): boolean {
  return isTwoPageReadyForReview(grid)
}

export type MobileCaptureSession = {
  leftPhotoCaptured: boolean
  rightPhotoCaptured: boolean
}

/** Scan results are on the grid (or left flag set) — safe for Review / Done · Retake. */
export function isMobileCaptureSideScanApplied(
  grid: CaptureGrid,
  pageSide: DigifiPageSide
): boolean {
  if (pageSide === 'left' && grid.leftPageScanned.value) return true
  if (pageSide === 'right' && grid.digifiScanStatusByPage.value.right) return true
  return pageHasScanData(grid as ReturnType<typeof useLogbookBuilderGrid>, pageSide)
}

/** True when this spread side already has a photo or applied scan — do not re-prompt capture. */
export function isMobileCaptureSideComplete(
  grid: CaptureGrid,
  pageSide: DigifiPageSide,
  photoCapturedThisSession: boolean
): boolean {
  if (photoCapturedThisSession) return true
  return isMobileCaptureSideScanApplied(grid, pageSide)
}

export function isTwoPageReadyForReview(grid: CaptureGrid): boolean {
  if (grid.layout.value !== 'two-page') {
    return isMobileCaptureSideScanApplied(grid, 'left')
  }
  return (
    isMobileCaptureSideScanApplied(grid, 'left') &&
    isMobileCaptureSideScanApplied(grid, 'right')
  )
}

export type MobileTwoPageChipState = 'waiting' | 'next' | 'scanning' | 'done'

export function mobileTwoPageChipLabel(state: MobileTwoPageChipState): string {
  switch (state) {
    case 'done':
      return 'Done · Retake'
    case 'scanning':
      return 'Scanning…'
    case 'next':
      return 'Next'
    case 'waiting':
      return 'After left'
  }
}

export function mobileTwoPageLeftChipState(
  grid: CaptureGrid,
  session: MobileCaptureSession,
  photoNext: DigifiPageSide | null
): MobileTwoPageChipState {
  if (isMobileCaptureSideScanApplied(grid, 'left')) return 'done'
  if (isMobileCaptureSideComplete(grid, 'left', session.leftPhotoCaptured)) return 'scanning'
  if (photoNext === 'left') return 'next'
  return 'waiting'
}

export function mobileTwoPageRightChipState(
  grid: CaptureGrid,
  session: MobileCaptureSession,
  photoNext: DigifiPageSide | null
): MobileTwoPageChipState {
  if (isMobileCaptureSideScanApplied(grid, 'right')) return 'done'
  if (isMobileCaptureSideComplete(grid, 'right', session.rightPhotoCaptured)) return 'scanning'
  if (photoNext === 'right') return 'next'
  if (photoNext === 'left') return 'waiting'
  if (photoNext === null) return 'scanning'
  return 'waiting'
}

/** Primary setup CTA: photograph next side, wait for scans, or open review. */
export function mobileSetupCaptureLabel(
  layout: BuilderLayout,
  photoNext: DigifiPageSide | null,
  readyForReview: boolean
): string {
  if (layout === 'two-page' && photoNext === null) {
    return readyForReview ? 'Review flights' : 'Scanning…'
  }
  return mobileCaptureLabel(photoNext, layout)
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
  if (side === null) return 'Review flights'
  if (layout === 'two-page' && side === 'right') return 'Photograph right page'
  if (layout === 'two-page') return 'Photograph left page'
  return 'Photograph page'
}

export function mobileTwoPageCaptureStep(side: DigifiPageSide | null): 1 | 2 | null {
  if (side === 'left') return 1
  if (side === 'right') return 2
  return null
}

/** Same gate as the setup "Review flights" CTA (both photos taken, both scans applied). */
export function shouldAutoOpenTwoPageReviewFromSetup(
  layout: BuilderLayout,
  photoNext: DigifiPageSide | null,
  readyForReview: boolean,
  phase: 'setup' | 'review'
): boolean {
  if (phase !== 'setup') return false
  if (layout !== 'two-page') return false
  if (!readyForReview) return false
  return photoNext === null
}
