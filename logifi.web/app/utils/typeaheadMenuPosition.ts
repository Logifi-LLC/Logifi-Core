const DEFAULT_MAX_HEIGHT = 192
const FLIP_THRESHOLD = 120
const VIEWPORT_PAD = 4

export type TypeaheadMenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: 'above' | 'below'
}

export type TypeaheadSafeArea = {
  top: number
  right: number
  bottom: number
  left: number
}

export type TypeaheadMenuEnv = {
  /** iOS WKWebView: position:fixed tracks the visual viewport. Chrome uses the layout viewport. */
  fixedTracksVisualViewport?: boolean
  safeArea?: TypeaheadSafeArea
}

const ZERO_SAFE: TypeaheadSafeArea = { top: 0, right: 0, bottom: 0, left: 0 }

let cachedSafeArea: TypeaheadSafeArea | null = null

export function readSafeAreaInsets(): TypeaheadSafeArea {
  if (cachedSafeArea) return cachedSafeArea
  if (typeof document === 'undefined' || !document.body) return ZERO_SAFE
  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top)',
    'padding-right:env(safe-area-inset-right)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
  ].join(';')
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const parse = (value: string) => {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  cachedSafeArea = {
    top: parse(style.paddingTop),
    right: parse(style.paddingRight),
    bottom: parse(style.paddingBottom),
    left: parse(style.paddingLeft),
  }
  probe.remove()
  return cachedSafeArea
}

/**
 * iPhone/iPad WKWebView lays out position:fixed in the visual viewport.
 * getBoundingClientRect is already in that space — subtracting
 * visualViewport.offsetTop clamps the menu to y≈4 (under the notch).
 */
export function fixedTracksVisualViewport(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  platform = typeof navigator !== 'undefined' ? navigator.platform : '',
  maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return platform === 'MacIntel' && maxTouchPoints > 1
}

/** Position a fixed typeahead menu next to an anchor, inside the visual viewport. */
export function computeTypeaheadMenuPosition(
  anchor: HTMLElement,
  maxHeight = DEFAULT_MAX_HEIGHT,
  gap = 2,
  env?: TypeaheadMenuEnv
): TypeaheadMenuPosition {
  const rect = anchor.getBoundingClientRect()
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  const offsetTop = vv?.offsetTop ?? 0
  const offsetLeft = vv?.offsetLeft ?? 0
  const viewportHeight = vv?.height ?? window.innerHeight
  const viewportWidth = vv?.width ?? window.innerWidth
  const tracksVisual = env?.fixedTracksVisualViewport ?? fixedTracksVisualViewport()
  const originTop = tracksVisual ? 0 : offsetTop
  const originLeft = tracksVisual ? 0 : offsetLeft
  const safe = env?.safeArea ?? readSafeAreaInsets()

  const anchorTop = rect.top + originTop
  const anchorBottom = rect.bottom + originTop
  const anchorLeft = rect.left + originLeft

  const minTop = originTop + Math.max(VIEWPORT_PAD, safe.top)
  const maxBottom = originTop + viewportHeight - Math.max(VIEWPORT_PAD, safe.bottom)
  const minLeft = originLeft + Math.max(VIEWPORT_PAD, safe.left)
  const maxRight = originLeft + viewportWidth - Math.max(VIEWPORT_PAD, safe.right)

  const spaceBelow = maxBottom - anchorBottom - gap
  const spaceAbove = anchorTop - minTop - gap

  let placement: 'above' | 'below' = 'below'
  let available = spaceBelow
  if (spaceBelow < Math.min(maxHeight, FLIP_THRESHOLD) && spaceAbove > spaceBelow) {
    placement = 'above'
    available = spaceAbove
  }

  const menuHeight = Math.min(maxHeight, Math.max(0, available))
  const width = Math.max(rect.width, 120)
  const maxLeft = maxRight - width
  const left = Math.min(Math.max(anchorLeft, minLeft), Math.max(minLeft, maxLeft))

  let top = placement === 'below' ? anchorBottom + gap : anchorTop - gap - menuHeight
  const maxTop = Math.max(minTop, maxBottom - menuHeight)
  top = Math.min(Math.max(top, minTop), maxTop)

  return { top, left, width, maxHeight: menuHeight, placement }
}

/** Scroll only when the anchor is outside the visible band above the keyboard. */
export function scrollTypeaheadAnchorIntoView(anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect()
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const safeTop = readSafeAreaInsets().top
  const margin = 8
  if (rect.top >= safeTop + margin && rect.bottom <= height - margin) return
  try {
    anchor.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
  } catch {
    anchor.scrollIntoView()
  }
}
