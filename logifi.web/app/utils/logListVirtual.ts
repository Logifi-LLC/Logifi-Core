export const LOG_LIST_OVERSCAN = 8
export const LOG_LIST_TABLE_ROW_ESTIMATE_PX = 56
export const LOG_LIST_CARD_ESTIMATE_PX = 128

export interface VirtualRangeItem {
  start: number
  end: number
}

export interface VirtualListPadding {
  paddingTop: number
  paddingBottom: number
}

/**
 * Top/bottom spacer heights for a virtual window, in list-local pixels.
 * Window virtualizers include `scrollMargin` in item start/end; subtract it
 * so table padding rows do not leave a hole under the header.
 */
export function getVirtualPadding(
  virtualItems: readonly VirtualRangeItem[],
  totalSize: number,
  scrollMargin = 0
): VirtualListPadding {
  if (virtualItems.length === 0) {
    return { paddingTop: 0, paddingBottom: 0 }
  }
  const first = virtualItems[0]
  const last = virtualItems[virtualItems.length - 1]
  const firstStart = first.start - scrollMargin
  const lastEnd = last.end - scrollMargin
  return {
    paddingTop: Math.max(0, firstStart),
    paddingBottom: Math.max(0, totalSize - lastEnd),
  }
}
