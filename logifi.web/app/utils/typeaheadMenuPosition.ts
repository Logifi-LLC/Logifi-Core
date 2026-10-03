/** About five option rows (py-2 + text-sm). Extra names scroll inside the menu. */
export const TYPEAHEAD_OPTION_HEIGHT = 36
export const TYPEAHEAD_VISIBLE_OPTIONS = 5
export const TYPEAHEAD_MENU_MAX_HEIGHT = TYPEAHEAD_OPTION_HEIGHT * TYPEAHEAD_VISIBLE_OPTIONS

export type TypeaheadScrollInput = {
  anchorTop: number
  anchorBottom: number
  menuHeight: number
  viewportHeight: number
  safeTop?: number
  safeBottom?: number
}

/**
 * Pixels to scroll the page upward so a menu that hangs off the cell's bottom
 * edge stays inside the visual viewport. Never negative — the menu is not moved
 * above the cell.
 */
export function typeaheadScrollDelta(input: TypeaheadScrollInput): number {
  const safeTop = input.safeTop ?? 0
  const safeBottom = input.safeBottom ?? 0
  const bottomLimit = input.viewportHeight - safeBottom
  const menuBottom = input.anchorBottom + input.menuHeight
  let delta = menuBottom > bottomLimit ? menuBottom - bottomLimit : 0
  const nextTop = input.anchorTop - delta
  if (nextTop < safeTop) delta = Math.max(0, input.anchorTop - safeTop)
  return delta
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

/** Horizontal carousels set overflow-x only; CSS promotes overflow-y and would steal the scroll. */
function isHorizontalOnlyScroller(node: HTMLElement): boolean {
  const className = typeof node.className === 'string' ? node.className : ''
  const horizontal =
    /\boverflow-x-(auto|scroll)\b/.test(className) &&
    !/\boverflow-y-(auto|scroll)\b/.test(className) &&
    !/\boverflow-(auto|scroll)\b/.test(className)
  return horizontal
}

function verticalScroller(anchor: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = anchor.parentElement
  while (node) {
    if (!isHorizontalOnlyScroller(node)) {
      const style = getComputedStyle(node)
      const overflowY = style.overflowY
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        return node
      }
    }
    node = node.parentElement
  }
  return null
}

/** Fixed Review chrome that would cover the cell or the menu. */
function viewportChromeInsets(viewportHeight: number): { top: number; bottom: number } {
  const safe = readSafeAreaInsets()
  let top = Math.max(4, safe.top)
  let bottom = Math.max(4, safe.bottom)
  if (typeof document === 'undefined') return { top, bottom }

  const header = document.querySelector('header')
  if (header instanceof HTMLElement) {
    const style = getComputedStyle(header)
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = header.getBoundingClientRect()
      if (rect.bottom > 0 && rect.top < viewportHeight) top = Math.max(top, rect.bottom)
    }
  }

  const footer = document.querySelector('footer')
  if (footer instanceof HTMLElement) {
    const style = getComputedStyle(footer)
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = footer.getBoundingClientRect()
      if (rect.top < viewportHeight && rect.bottom > 0) {
        bottom = Math.max(bottom, viewportHeight - rect.top)
      }
    }
  }

  return { top, bottom }
}

/** Scroll so the open menu, still attached under the cell, clears the keyboard. */
export function scrollTypeaheadMenuIntoVisualViewport(
  anchor: HTMLElement,
  menu: HTMLElement
): void {
  const anchorRect = anchor.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const chrome = viewportChromeInsets(height)
  const menuHeight = Math.max(menuRect.height, Math.min(menu.scrollHeight, TYPEAHEAD_MENU_MAX_HEIGHT))
  const delta = typeaheadScrollDelta({
    anchorTop: anchorRect.top,
    anchorBottom: anchorRect.bottom,
    menuHeight,
    viewportHeight: height,
    safeTop: chrome.top,
    safeBottom: chrome.bottom,
  })
  if (delta <= 0) return
  const scroller = verticalScroller(anchor)
  if (scroller) scroller.scrollTop += delta
  else window.scrollBy(0, delta)
}
