/** About five option rows (py-2 + text-sm). Extra names scroll inside the menu. */
export const TYPEAHEAD_OPTION_HEIGHT = 36
export const TYPEAHEAD_VISIBLE_OPTIONS = 5
export const TYPEAHEAD_MENU_MAX_HEIGHT = TYPEAHEAD_OPTION_HEIGHT * TYPEAHEAD_VISIBLE_OPTIONS

export type TypeaheadPlacement = 'down' | 'up'

export type TypeaheadPlacementInput = {
  spaceAbove: number
  spaceBelow: number
  /** Preferred menu height, already capped at about five options. */
  menuHeight: number
}

export type TypeaheadPlacementDecision = {
  placement: TypeaheadPlacement
  maxHeight: number
}

/**
 * Open downward when the menu fits under the cell. Otherwise open upward.
 * If neither side fits, use the larger side and cap the height to that space.
 * Does not scroll the page.
 */
export function chooseTypeaheadPlacement(
  input: TypeaheadPlacementInput
): TypeaheadPlacementDecision {
  const desired = Math.max(0, input.menuHeight)
  const above = Math.max(0, input.spaceAbove)
  const below = Math.max(0, input.spaceBelow)
  if (below >= desired) return { placement: 'down', maxHeight: desired }
  if (above >= desired) return { placement: 'up', maxHeight: desired }
  if (above > below) return { placement: 'up', maxHeight: above }
  return { placement: 'down', maxHeight: below }
}

export type TypeaheadSafeArea = {
  top: number
  right: number
  bottom: number
  left: number
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

/** WKWebView reports rects in visual-viewport coordinates. Desktop Chrome does not. */
function fixedTracksVisualViewport(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function viewportLimits(): { top: number; bottom: number } {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = fixedTracksVisualViewport() ? 0 : (vv?.offsetTop ?? 0)
  const bottom = top + height
  const safe = readSafeAreaInsets()
  let limitTop = top + Math.max(0, safe.top)
  let limitBottom = bottom - Math.max(0, safe.bottom)

  const header = document.querySelector('header')
  if (header instanceof HTMLElement) {
    const style = getComputedStyle(header)
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = header.getBoundingClientRect()
      if (rect.bottom > limitTop && rect.top < limitBottom) limitTop = Math.max(limitTop, rect.bottom)
    }
  }

  const footer = document.querySelector('footer')
  if (footer instanceof HTMLElement) {
    const style = getComputedStyle(footer)
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = footer.getBoundingClientRect()
      if (rect.top < limitBottom && rect.bottom > limitTop) limitBottom = Math.min(limitBottom, rect.top)
    }
  }

  return { top: limitTop, bottom: limitBottom }
}

/** Overflow on the review card clips a menu that leaves the column list. */
function clipLimits(anchor: HTMLElement): { top: number; bottom: number } | null {
  let top = -Infinity
  let bottom = Infinity
  let found = false
  let node: HTMLElement | null = anchor.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node)
    if (style.overflowY !== 'visible') {
      const rect = node.getBoundingClientRect()
      top = Math.max(top, rect.top)
      bottom = Math.min(bottom, rect.bottom)
      found = true
    }
    node = node.parentElement
  }
  return found ? { top, bottom } : null
}

export function measureTypeaheadSpace(anchor: HTMLElement): { spaceAbove: number; spaceBelow: number } {
  const rect = anchor.getBoundingClientRect()
  const view = viewportLimits()
  const clip = clipLimits(anchor)
  const top = clip ? Math.max(view.top, clip.top) : view.top
  const bottom = clip ? Math.min(view.bottom, clip.bottom) : view.bottom
  return {
    spaceAbove: rect.top - top,
    spaceBelow: bottom - rect.bottom,
  }
}

export function placeTypeaheadMenu(
  anchor: HTMLElement,
  menuHeight: number
): TypeaheadPlacementDecision {
  const space = measureTypeaheadSpace(anchor)
  return chooseTypeaheadPlacement({ ...space, menuHeight })
}
