const DEFAULT_MAX_HEIGHT = 192

export type TypeaheadMenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: 'above' | 'below'
}

/** Position a fixed typeahead menu relative to an anchor, using the visual viewport when available. */
export function computeTypeaheadMenuPosition(
  anchor: HTMLElement,
  maxHeight = DEFAULT_MAX_HEIGHT,
  gap = 2
): TypeaheadMenuPosition {
  const rect = anchor.getBoundingClientRect()
  const vv = window.visualViewport
  const offsetTop = vv?.offsetTop ?? 0
  const offsetLeft = vv?.offsetLeft ?? 0
  const viewportHeight = vv?.height ?? window.innerHeight
  const viewportWidth = vv?.width ?? window.innerWidth

  // Fixed positioning is relative to the visual viewport; layout rects need offset adjustment.
  const anchorTop = rect.top - offsetTop
  const anchorBottom = rect.bottom - offsetTop
  const anchorLeft = rect.left - offsetLeft

  const spaceBelow = viewportHeight - anchorBottom - gap
  const spaceAbove = anchorTop - gap

  let placement: 'above' | 'below' = 'below'
  let available = spaceBelow
  if (spaceBelow < Math.min(maxHeight, 120) && spaceAbove > spaceBelow) {
    placement = 'above'
    available = spaceAbove
  }

  const clampedMaxHeight = Math.max(80, Math.min(maxHeight, available - 4))
  const width = Math.max(rect.width, 120)
  let left = anchorLeft
  const minLeft = 8
  const maxLeft = viewportWidth - width - 8
  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft))

  let top =
    placement === 'below'
      ? anchorBottom + gap
      : anchorTop - gap - clampedMaxHeight

  top = Math.max(4, Math.min(top, viewportHeight - clampedMaxHeight - 4))

  return { top, left, width, maxHeight: clampedMaxHeight, placement }
}

export function scrollTypeaheadAnchorIntoView(anchor: HTMLElement): void {
  try {
    anchor.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  } catch {
    anchor.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}
