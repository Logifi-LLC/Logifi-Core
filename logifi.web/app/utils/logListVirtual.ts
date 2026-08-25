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
 * Top/bottom spacer heights for a virtual window.
 * `scrollMargin` is subtracted from the first item start (window virtualizer).
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
  return {
    paddingTop: Math.max(0, first.start - scrollMargin),
    paddingBottom: Math.max(0, totalSize - last.end),
  }
}
