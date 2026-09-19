import type { BuilderLayout } from './logbookBuilderTypes'
import type { DigifiPageSide } from './digifiTypes'

export const DIGIFI_MOBILE_SCAN_PATH = '/digifi-scan'
export const DIGIFI_EYE_PATH = '/digifi-eye'
export const DIGIFI_WEB_BUILDER_PATH = '/logbook-builder?digifi=open'

export type DigifiPageShape = 'left' | 'right' | 'two-page'

export function readDigifiMobileReviewFlag(): string {
  try {
    const config = useRuntimeConfig()
    return String(config.public.digifiMobileReview ?? 'on')
  } catch {
    return 'on'
  }
}

/** Default on so Cap/TestFlight can exercise /digifi-scan. Set NUXT_PUBLIC_DIGIFI_MOBILE_REVIEW=off to keep iOS entries on Digifi Eye. */
export function isDigifiMobileReviewEnabled(flag = readDigifiMobileReviewFlag()): boolean {
  const value = flag.trim().toLowerCase()
  return value !== 'off' && value !== 'false' && value !== '0'
}

export function resolveDigifiAppRoute(options: {
  isIos: boolean
  mobileReviewEnabled?: boolean
  webPath?: 'marketing' | 'builder'
}): string {
  if (!options.isIos) {
    return options.webPath === 'marketing' ? '/digifi' : DIGIFI_WEB_BUILDER_PATH
  }
  const enabled = options.mobileReviewEnabled ?? isDigifiMobileReviewEnabled()
  return enabled ? DIGIFI_MOBILE_SCAN_PATH : DIGIFI_EYE_PATH
}

export function layoutFromPageShape(shape: DigifiPageShape): BuilderLayout {
  return shape === 'two-page' ? 'two-page' : 'single'
}

export function scanSideForPageShape(
  shape: DigifiPageShape,
  leftPageScanned: boolean
): DigifiPageSide {
  if (shape === 'right') return 'right'
  if (shape === 'two-page' && leftPageScanned) return 'right'
  return 'left'
}

export function pageShapeFromLayout(
  layout: BuilderLayout,
  preferredSide: DigifiPageSide = 'left'
): DigifiPageShape {
  if (layout === 'two-page') return 'two-page'
  return preferredSide
}

export function focusedColumnIndexFromScroll(
  scrollLeft: number,
  itemStride: number,
  itemCount: number
): number {
  if (itemCount <= 0 || itemStride <= 0) return 0
  return Math.min(itemCount - 1, Math.max(0, Math.round(scrollLeft / itemStride)))
}

export function markColumnReviewed(
  reviewedIds: ReadonlySet<string>,
  columnId: string
): Set<string> {
  const next = new Set(reviewedIds)
  if (columnId) next.add(columnId)
  return next
}
