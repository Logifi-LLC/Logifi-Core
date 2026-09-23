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
  const viewportTop = vv?.offsetTop ?? 0
  const viewportLeft = vv?.offsetLeft ?? 0
  const viewportHeight = vv?.height ?? window.innerHeight
  const viewportWidth = vv?.width ?? window.innerWidth

  const spaceBelow = viewportTop + viewportHeight - rect.bottom - gap
  const spaceAbove = rect.top - viewportTop - gap

  let placement: 'above' | 'below' = 'below'
  let available = spaceBelow
  if (spaceBelow < Math.min(maxHeight, 120) && spaceAbove > spaceBelow) {
    placement = 'above'
    available = spaceAbove
  }

  const clampedMaxHeight = Math.max(80, Math.min(maxHeight, available - 4))
  const width = Math.max(rect.width, 120)
  let left = rect.left
  const minLeft = viewportLeft + 8
  const maxLeft = viewportLeft + viewportWidth - width - 8
  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft))

  let top =
    placement === 'below'
      ? rect.bottom + gap
      : rect.top - gap - clampedMaxHeight

  top = Math.max(
    viewportTop + 4,
    Math.min(top, viewportTop + viewportHeight - clampedMaxHeight - 4)
  )

  return { top, left, width, maxHeight: clampedMaxHeight, placement }
}

export function scrollTypeaheadAnchorIntoView(anchor: HTMLElement): void {
  try {
    anchor.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  } catch {
    anchor.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}
